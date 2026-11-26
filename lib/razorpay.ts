/**
 * A small Razorpay client using the REST API directly (no SDK needed).
 * Docs: https://razorpay.com/docs/api/orders/
 */
import crypto from "node:crypto";

const API = "https://api.razorpay.com/v1";

export function razorpayEnabled(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

function auth(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set.");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(`Razorpay ${res.status}: ${data.error?.description ?? "request failed"}`);
  return data;
}

export interface RazorpayOrder {
  id: string; // "order_..."
  amount: number; // paise
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
}

export interface RazorpayPayment {
  id: string; // "pay_..."
  order_id: string;
  amount: number;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
}

/** Creates a Razorpay order for an amount in rupees. */
export function createRazorpayOrder(input: { amountInRupees: number; receipt: string; notes?: Record<string, string> }) {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(input.amountInRupees * 100),
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });
}

/** Payments made against a Razorpay order; used to double-check before cancelling. */
export async function fetchOrderPayments(razorpayOrderId: string): Promise<RazorpayPayment[]> {
  const data = await call<{ items: RazorpayPayment[] }>(`/orders/${encodeURIComponent(razorpayOrderId)}/payments`);
  return data.items ?? [];
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checkout's success signature: HMAC-SHA256(order_id + "|" + payment_id) with the key secret. */
export function verifyPaymentSignature(razorpayOrderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !razorpayOrderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${razorpayOrderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
