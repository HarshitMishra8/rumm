import crypto from "node:crypto";
import { StoreError, read, tx } from "@/lib/db";
import { view } from "@/lib/cart";
import { EMAIL_RE, type PublicUser } from "@/lib/users";
import { assemblyFee, deliveryDate, deliveryFee } from "@/lib/pricing";
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

export async function placeOrder(input: {
  cartId: string | undefined;
  user: PublicUser | null;
  email?: string;
  address: Partial<Address>;
  deliveryOption: DeliveryOption;
  payment: PaymentOption;
}) {
  const address = validateAddress(input.address);
  const email = (input.user?.email ?? input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new StoreError("Enter an email address for your order confirmation.");
  const deliveryOption: DeliveryOption = input.deliveryOption === "assembly" ? "assembly" : "standard";
  const payment: PaymentOption = input.payment === "upi-on-delivery" ? "upi-on-delivery" : "cod";

  return tx((db) => {
    const lines = input.cartId ? db.carts[input.cartId] ?? [] : [];
    if (lines.length === 0) throw new StoreError("Your bag is empty.", 409);
    const v = view(lines);
    for (const l of v.lines) {
      if (db.stock[l.productId] < l.qty) {
        throw new StoreError(`Only ${db.stock[l.productId]} of ${l.product.name} left. Lower the quantity to continue.`, 409);
      }
    }
    for (const l of v.lines) db.stock[l.productId] -= l.qty;

    const subtotal = v.subtotal;
    const delivery = deliveryFee(subtotal);
    const assembly = deliveryOption === "assembly" ? assemblyFee(subtotal) : 0;
    const now = new Date();
    const order: Order = {
      id: `RM-${now.getFullYear()}-${crypto.randomInt(100000, 999999)}`,
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
      status: "placed",
      createdAt: now.toISOString(),
      deliverBy: deliveryDate(now, deliveryOption === "assembly" ? 4 : 3).toISOString(),
    };
    db.orders.push(order);
    delete db.carts[input.cartId!];
    return order;
  });
}

export function getOrder(id: string) {
  return read((db) => db.orders.find((o) => o.id === id) ?? null);
}

export function ordersForUser(userId: string) {
  return read((db) =>
    db.orders.filter((o) => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
