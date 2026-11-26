/**
 * The product catalogue, read from MongoDB. Server-only.
 * Stock lives in the inventory collection and is merged in here.
 */
import { connectDB } from "@/lib/mongodb";
import { Product as ProductModel, type ProductDoc } from "@/models/Product";
import { Inventory, type InventoryDoc } from "@/models/Inventory";
import type { Product } from "@/lib/types";

export function toProduct(doc: ProductDoc, stock: number): Product {
  return {
    id: doc._id,
    slug: doc.slug,
    name: doc.name,
    type: doc.type,
    room: doc.room,
    art: doc.art,
    price: doc.price,
    wasPrice: doc.wasPrice ?? undefined,
    badge: doc.badge ?? undefined,
    blurb: doc.blurb,
    description: doc.description,
    details: [...doc.details],
    dimensions: { w: doc.dimensions.w, d: doc.dimensions.d, h: doc.dimensions.h },
    material: doc.material,
    wood: doc.wood,
    colorways: doc.colorways.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
    pieces: doc.pieces,
    assemblyMinutes: doc.assemblyMinutes,
    stock,
  };
}

async function stockMap(): Promise<Map<string, number>> {
  const rows = await Inventory.find().lean<InventoryDoc[]>();
  return new Map(rows.map((r) => [r._id, r.stock]));
}

/** Products shown in the shop, in their display order. */
export async function listProducts(): Promise<Product[]> {
  await connectDB();
  const [docs, stock] = await Promise.all([
    ProductModel.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }).lean<ProductDoc[]>(),
    stockMap(),
  ]);
  return docs.map((d) => toProduct(d, stock.get(d._id) ?? 0));
}

/** Every product including hidden ones, for the admin panel. */
export async function listAllProducts(): Promise<(Product & { active: boolean })[]> {
  await connectDB();
  const [docs, stock] = await Promise.all([
    ProductModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean<ProductDoc[]>(),
    stockMap(),
  ]);
  return docs.map((d) => ({ ...toProduct(d, stock.get(d._id) ?? 0), active: d.active }));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await connectDB();
  const doc = await ProductModel.findOne({ slug, active: true }).lean<ProductDoc>();
  if (!doc) return null;
  const inv = await Inventory.findById(doc._id).lean<InventoryDoc>();
  return toProduct(doc, inv?.stock ?? 0);
}

/** Active products by id, for joining bag lines with catalogue data. */
export async function productMap(): Promise<Map<string, Product>> {
  return new Map((await listProducts()).map((p) => [p.id, p]));
}
