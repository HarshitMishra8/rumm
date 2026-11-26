/** Reads and writes used only by the admin panel. Server-only. */
import { connectDB } from "@/lib/mongodb";
import { StoreError, isDuplicateKey } from "@/lib/errors";
import { toProduct } from "@/lib/products";
import { Product as ProductModel, type ProductDoc } from "@/models/Product";
import { Inventory, type InventoryDoc } from "@/models/Inventory";
import { Order as OrderModel, type OrderDoc } from "@/models/Order";
import type { ProductInput } from "@/lib/productInput";
import { releaseStalePayments } from "@/lib/payments";
import type { Order, Product } from "@/lib/types";

export type AdminProduct = Product & { active: boolean; sortOrder: number };

/* -------------------------------------------------------------- products */

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  await connectDB();
  const doc = await ProductModel.findById(id).lean<ProductDoc>();
  if (!doc) return null;
  const inv = await Inventory.findById(id).lean<InventoryDoc>();
  return { ...toProduct(doc, inv?.stock ?? 0), active: doc.active, sortOrder: doc.sortOrder };
}

function fields(input: ProductInput) {
  const { stock: _stock, ...rest } = input;
  return rest;
}

export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  await connectDB();
  const id = `p-${input.slug}`;
  try {
    await ProductModel.create({ _id: id, ...fields(input) });
  } catch (err) {
    if (isDuplicateKey(err)) throw new StoreError("A product with this web address already exists. Change the name or the web address.", 409);
    throw err;
  }
  await Inventory.updateOne({ _id: id }, { $set: { stock: input.stock } }, { upsert: true });
  return (await getAdminProduct(id))!;
}

export async function updateProduct(id: string, input: ProductInput): Promise<AdminProduct> {
  await connectDB();
  try {
    const res = await ProductModel.updateOne({ _id: id }, { $set: fields(input) });
    if (res.matchedCount === 0) throw new StoreError("That product doesn't exist any more.", 404);
  } catch (err) {
    if (isDuplicateKey(err)) throw new StoreError("Another product already uses this web address. Change it and save again.", 409);
    throw err;
  }
  await Inventory.updateOne({ _id: id }, { $set: { stock: input.stock } }, { upsert: true });
  return (await getAdminProduct(id))!;
}

/* ---------------------------------------------------------------- orders */

export const ORDER_STATUSES = ["placed", "packed", "shipped", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

function summary(o: OrderDoc) {
  return {
    id: o._id,
    email: o.email,
    name: o.address.fullName,
    city: o.address.city,
    items: o.lines.reduce((n, l) => n + l.qty, 0),
    total: o.total,
    payment: o.payment,
    paymentStatus: o.paymentStatus ?? "not_required",
    status: o.status,
    createdAt: new Date(o.createdAt).toISOString(),
    deliverBy: new Date(o.deliverBy).toISOString(),
  };
}
export type OrderSummary = ReturnType<typeof summary>;

const LISTABLE: string[] = [...ORDER_STATUSES, "cancelled"];

export async function listOrders(status?: string, limit = 200): Promise<OrderSummary[]> {
  await connectDB();
  await releaseStalePayments().catch((err) => console.error(err));
  const filter = LISTABLE.includes(status ?? "") ? { status } : {};
  const docs = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean<OrderDoc[]>();
  return docs.map(summary);
}

export async function setOrderStatus(id: string, status: string): Promise<Order["status"]> {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) throw new StoreError("Choose a status from the list.");
  await connectDB();
  const doc = await OrderModel.findById(id).lean<OrderDoc>();
  if (!doc) throw new StoreError("That order doesn't exist.", 404);
  if (doc.status === "cancelled") throw new StoreError("This order was cancelled, so its status can't change.", 409);
  if (doc.paymentStatus === "pending") throw new StoreError("This order hasn't been paid yet. Wait for the payment before packing it.", 409);
  await OrderModel.updateOne({ _id: id }, { $set: { status } });
  return status as OrderStatus;
}

/* ------------------------------------------------------------- overview */

export async function overview() {
  await connectDB();
  await releaseStalePayments().catch((err) => console.error(err));
  const since = new Date(Date.now() - 7 * 864e5);
  const [recent, open, stockRows, products] = await Promise.all([
    // count only orders that are going ahead: not cancelled, not waiting for payment
    OrderModel.find({ createdAt: { $gte: since }, status: { $ne: "cancelled" }, paymentStatus: { $ne: "pending" } }).lean<OrderDoc[]>(),
    OrderModel.find({ status: { $in: ["placed", "packed"] }, paymentStatus: { $ne: "pending" } }).lean<OrderDoc[]>(),
    Inventory.find().lean<InventoryDoc[]>(),
    ProductModel.find({ active: true }).lean<ProductDoc[]>(),
  ]);
  const stock = new Map(stockRows.map((r) => [r._id, r.stock]));
  const lowStock = products
    .map((p) => ({ id: p._id, name: p.name, type: p.type, stock: stock.get(p._id) ?? 0 }))
    .filter((p) => p.stock < 10)
    .sort((a, b) => a.stock - b.stock);
  return {
    ordersThisWeek: recent.length,
    revenueThisWeek: recent.reduce((n, o) => n + o.total, 0),
    toShip: open.length,
    lowStock,
  };
}
