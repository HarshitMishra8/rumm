import crypto from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { StoreError, isDuplicateKey } from "@/lib/errors";
import { view } from "@/lib/cart";
import { EMAIL_RE, type PublicUser } from "@/lib/users";
import { assemblyFee, deliveryDate, deliveryFee } from "@/lib/pricing";
import { Cart, type CartDoc } from "@/models/Cart";
import { Inventory, type InventoryDoc } from "@/models/Inventory";
import { Order as OrderModel, type OrderDoc } from "@/models/Order";
import type { Address, DeliveryOption, Order, PaymentOption } from "@/lib/types";

const PIN_RE = /^[1-9][0-9]{5}$/;
const PHONE_RE = /^(\+91[\s-]?)?[6-9][0-9]{9}$/;

function validateAddress(a: Partial<Address> | undefined): Address {
  const t = (s?: string) => (s ?? "").trim();
  const addr: Address = {
    fullName: t(a?.fullName),
    phone: t(a?.phone).replace(/\s+/g, ""),
    line1: t(a?.line1),
    line2: t(a?.line2) || undefined,
    city: t(a?.city),
    pin: t(a?.pin),
  };
  if (addr.fullName.length < 2) throw new StoreError("Enter the name of the person receiving the delivery.");
  if (!PHONE_RE.test(addr.phone)) throw new StoreError("Enter a 10-digit mobile number so the driver can call.");
  if (addr.line1.length < 4) throw new StoreError("Enter the house number and street.");
  if (addr.city.length < 2) throw new StoreError("Enter your city.");
  if (!PIN_RE.test(addr.pin)) throw new StoreError("Enter a 6-digit PIN code.");
  return addr;
}

/** MongoDB document → the Order shape the pages already use. */
function toOrder(doc: OrderDoc): Order {
  return {
    id: doc._id,
    userId: doc.userId ? String(doc.userId) : null,
    email: doc.email,
    lines: doc.lines.map((l) => ({ productId: l.productId, name: l.name, colorway: l.colorway, unitPrice: l.unitPrice, qty: l.qty })),
    subtotal: doc.subtotal,
    delivery: doc.delivery,
    assembly: doc.assembly,
    total: doc.total,
    address: {
      fullName: doc.address.fullName,
      phone: doc.address.phone,
      line1: doc.address.line1,
      line2: doc.address.line2 || undefined,
      city: doc.address.city,
      pin: doc.address.pin,
    },
    deliveryOption: doc.deliveryOption,
    payment: doc.payment,
    status: doc.status,
    createdAt: new Date(doc.createdAt).toISOString(),
    deliverBy: new Date(doc.deliverBy).toISOString(),
  };
}

const newOrderId = () => `RM-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`;

export async function placeOrder(input: {
  cartId: string | undefined;
  user: PublicUser | null;
  email?: string;
  address: Partial<Address>;
  deliveryOption: DeliveryOption;
  payment: PaymentOption;
}): Promise<Order> {
  const address = validateAddress(input.address);
  const email = (input.user?.email ?? input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new StoreError("Enter an email address for your order confirmation.");
  const deliveryOption: DeliveryOption = input.deliveryOption === "assembly" ? "assembly" : "standard";
  const payment: PaymentOption = input.payment === "upi-on-delivery" ? "upi-on-delivery" : "cod";
  const cartId = input.cartId;
  if (!cartId) throw new StoreError("Your bag is empty.", 409);

  await connectDB();

  // One retry in the very unlikely case two orders draw the same id.
  for (let attempt = 0; attempt < 2; attempt++) {
    const session = await mongoose.startSession();
    let placed: OrderDoc | null = null;
    try {
      // Everything below commits together or not at all.
      await session.withTransaction(async () => {
        const cart = await Cart.findById(cartId).session(session).lean<CartDoc>();
        const lines = (cart?.lines ?? []).map((l) => ({ productId: l.productId, colorwayId: l.colorwayId, qty: l.qty }));
        if (lines.length === 0) throw new StoreError("Your bag is empty.", 409);
        const v = view(lines);

        // Take the stock. The $gte condition means two customers can't both
        // buy the last one: the second update matches nothing.
        for (const l of v.lines) {
          const taken = await Inventory.updateOne(
            { _id: l.productId, stock: { $gte: l.qty } },
            { $inc: { stock: -l.qty } },
            { session },
          );
          if (taken.modifiedCount === 0) {
            const left = (await Inventory.findById(l.productId).session(session).lean<InventoryDoc>())?.stock ?? 0;
            throw new StoreError(`Only ${left} of ${l.product.name} left. Lower the quantity to continue.`, 409);
          }
        }

        const subtotal = v.subtotal;
        const delivery = deliveryFee(subtotal);
        const assembly = deliveryOption === "assembly" ? assemblyFee(subtotal) : 0;
        const now = new Date();

        const [created] = await OrderModel.create(
          [
            {
              _id: newOrderId(),
              userId: input.user?.id ?? null,
              email,
              lines: v.lines.map((l) => ({
                productId: l.productId,
                name: `${l.product.name} ${l.product.type.toLowerCase()}`,
                colorway: l.colorway.name,
                unitPrice: l.product.price,
                qty: l.qty,
              })),
              subtotal,
              delivery,
              assembly,
              total: subtotal + delivery + assembly,
              address,
              deliveryOption,
              payment,
              deliverBy: deliveryDate(now, deliveryOption === "assembly" ? 4 : 3),
            },
          ],
          { session },
        );

        await Cart.deleteOne({ _id: cartId }, { session });
        placed = created.toObject() as OrderDoc;
      });
    } catch (err) {
      if (attempt === 0 && isDuplicateKey(err)) continue;
      throw err;
    } finally {
      await session.endSession();
    }
    if (placed) return toOrder(placed);
  }
  throw new StoreError("The order couldn't be placed. Try again.", 500);
}

export async function getOrder(id: string): Promise<Order | null> {
  await connectDB();
  const doc = await OrderModel.findById(id).lean<OrderDoc>();
  return doc ? toOrder(doc) : null;
}

export async function ordersForUser(userId: string): Promise<Order[]> {
  await connectDB();
  const docs = await OrderModel.find({ userId }).sort({ createdAt: -1 }).lean<OrderDoc[]>();
  return docs.map(toOrder);
}
