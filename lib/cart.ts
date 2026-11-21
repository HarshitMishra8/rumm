import crypto from "node:crypto";
import { getProduct } from "@/data/products";
import { StoreError, read, tx } from "@/lib/db";
import type { CartLine, CartView } from "@/lib/types";

export function newCartId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function view(lines: CartLine[]): CartView {
  const out: CartView["lines"] = [];
  for (const l of lines) {
    const product = getProduct(l.productId);
    if (!product) continue;
    const colorway = product.colorways.find((c) => c.id === l.colorwayId) ?? product.colorways[0];
    out.push({ ...l, product, colorway, lineTotal: product.price * l.qty });
  }
  return {
    lines: out,
    count: out.reduce((n, l) => n + l.qty, 0),
    subtotal: out.reduce((n, l) => n + l.lineTotal, 0),
  };
}

export function getCart(cartId: string | undefined): Promise<CartView> {
  if (!cartId) return Promise.resolve(view([]));
  return read((db) => view(db.carts[cartId] ?? []));
}

const MAX_QTY = 20;

export function addToCart(cartId: string, items: { productId: string; colorwayId?: string; qty?: number }[]) {
  return tx((db) => {
    const lines = (db.carts[cartId] ??= []);
    for (const item of items) {
      const product = getProduct(item.productId);
      if (!product) throw new StoreError("That product no longer exists.", 404);
      const colorwayId = item.colorwayId && product.colorways.some((c) => c.id === item.colorwayId)
        ? item.colorwayId
        : product.colorways[0].id;
      const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(item.qty ?? 1)));
      const existing = lines.find((l) => l.productId === product.id && l.colorwayId === colorwayId);
      const nextQty = (existing?.qty ?? 0) + qty;
      if (nextQty > db.stock[product.id]) {
        throw new StoreError(`Only ${db.stock[product.id]} of ${product.name} left in stock.`, 409);
      }
      if (existing) existing.qty = Math.min(MAX_QTY, nextQty);
      else lines.push({ productId: product.id, colorwayId, qty });
    }
    return view(lines);
  });
}

export function setLineQty(cartId: string, productId: string, colorwayId: string, qty: number) {
  return tx((db) => {
    const lines = db.carts[cartId] ?? [];
    const line = lines.find((l) => l.productId === productId && l.colorwayId === colorwayId);
    if (!line) throw new StoreError("That item isn't in your bag.", 404);
    const q = Math.floor(qty);
    if (q <= 0) {
      db.carts[cartId] = lines.filter((l) => l !== line);
    } else {
      if (q > db.stock[productId]) throw new StoreError(`Only ${db.stock[productId]} left in stock.`, 409);
      line.qty = Math.min(MAX_QTY, q);
    }
    return view(db.carts[cartId] ?? []);
  });
}

