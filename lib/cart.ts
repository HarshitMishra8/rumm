import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { StoreError, isDuplicateKey } from "@/lib/errors";
import { Cart, type CartDoc } from "@/models/Cart";
import { productMap } from "@/lib/products";
import type { CartLine, CartView, Product } from "@/lib/types";

const MAX_QTY = 20;

export function newCartId(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Joins bag lines with catalogue data and works out totals.
 * Lines for products that were hidden or removed are left out.
 */
export function view(lines: CartLine[], products: Map<string, Product>): CartView {
  const out: CartView["lines"] = [];
  for (const l of lines) {
    const product = products.get(l.productId);
    if (!product) continue;
    const colorway = product.colorways.find((c) => c.id === l.colorwayId) ?? product.colorways[0];
    out.push({ productId: l.productId, colorwayId: l.colorwayId, qty: l.qty, product, colorway, lineTotal: product.price * l.qty });
  }
  return {
    lines: out,
    count: out.reduce((n, l) => n + l.qty, 0),
    subtotal: out.reduce((n, l) => n + l.lineTotal, 0),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const plain = (lines: CartLine[]): CartLine[] =>
  lines.map((l) => ({ productId: l.productId, colorwayId: l.colorwayId, qty: l.qty }));

export async function getCart(cartId: string | undefined): Promise<CartView> {
  if (!cartId) return view([], new Map());
  await connectDB();
  const [cart, products] = await Promise.all([Cart.findById(cartId).lean<CartDoc>(), productMap()]);
  return view(plain(cart?.lines ?? []), products);
}

/**
 * Read the bag, change its lines, and write them back only if nobody else
 * changed the bag in between (checked with the document version, __v).
 * Two quick taps on "Add" therefore both count instead of one overwriting the other.
 */
async function mutate(
  cartId: string,
  change: (lines: CartLine[], products: Map<string, Product>) => void,
): Promise<CartView> {
  await connectDB();
  const products = await productMap(); // includes current stock
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) await sleep(5 + Math.random() * 20 * attempt); // back off so racing requests spread out
    const doc = await Cart.findById(cartId).lean<CartDoc>();
    const lines = plain(doc?.lines ?? []);
    change(lines, products);

    if (!doc) {
      try {
        await Cart.create({ _id: cartId, lines });
        return view(lines, products);
      } catch (err) {
        if (isDuplicateKey(err)) continue; // another request created it first
        throw err;
      }
    }
    const res = await Cart.updateOne({ _id: cartId, __v: doc.__v }, { $set: { lines }, $inc: { __v: 1 } });
    if (res.matchedCount === 1) return view(lines, products);
  }
  throw new StoreError("Your bag was changed in another tab. Try again.", 409);
}

export function addToCart(cartId: string, items: { productId: string; colorwayId?: string; qty?: number }[]) {
  return mutate(cartId, (lines, products) => {
    for (const item of items) {
      const product = products.get(item.productId);
      if (!product) throw new StoreError("That product no longer exists.", 404);
      const colorwayId =
        item.colorwayId && product.colorways.some((c) => c.id === item.colorwayId) ? item.colorwayId : product.colorways[0].id;
      const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(item.qty ?? 1)));

      const existing = lines.find((l) => l.productId === product.id && l.colorwayId === colorwayId);
      const nextQty = Math.min(MAX_QTY, (existing?.qty ?? 0) + qty);
      if (nextQty > product.stock) throw new StoreError(`Only ${product.stock} of ${product.name} left in stock.`, 409);

      if (existing) existing.qty = nextQty;
      else lines.push({ productId: product.id, colorwayId, qty: nextQty });
    }
  });
}

export function setLineQty(cartId: string, productId: string, colorwayId: string, qty: number) {
  return mutate(cartId, (lines, products) => {
    const i = lines.findIndex((l) => l.productId === productId && l.colorwayId === colorwayId);
    if (i < 0) throw new StoreError("That item isn't in your bag.", 404);
    const q = Math.floor(qty);
    if (q <= 0) {
      lines.splice(i, 1);
      return;
    }
    const stock = products.get(productId)?.stock ?? 0;
    if (q > stock) throw new StoreError(`Only ${stock} left in stock.`, 409);
    lines[i].qty = Math.min(MAX_QTY, q);
  });
}
