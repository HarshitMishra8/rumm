export const FREE_DELIVERY_FROM = 4999;
export const DELIVERY_FEE = 499;

export function deliveryFee(subtotal: number): number {
  if (subtotal === 0) return 0;
  return subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
}

/** Assembly service: 6% of the order, minimum ₹699. */
export function assemblyFee(subtotal: number): number {
  if (subtotal === 0) return 0;
  return Math.max(699, Math.round((subtotal * 0.06) / 10) * 10);
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export function formatINR(n: number): string {
  return `₹${inr.format(n)}`;
}

/** Delivery date: 3 working days for flat-pack, skipping Sundays. */
export function deliveryDate(from = new Date(), days = 3): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
}

export function formatDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}
