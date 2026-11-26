/**
 * Online payments with Razorpay.
 *
 * 1. placeOrder() takes the stock and saves the order as "payment pending",
 *    keeping the customer's bag.
 * 2. startOnlinePayment() creates the matching Razorpay order.
 * 3. The browser opens Razorpay Checkout. On success, confirmPayment() checks
 *    the signature and marks the order paid; the bag is emptied.
 * 4. If the customer closes Checkout, cancelPayment() gives the stock back.
 * 5. The webhook and the stale-payment sweep catch everything else (tab closed
 *    mid-payment, network drops), always asking Razorpay before cancelling.
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { StoreError } from "@/lib/errors";
import { toOrder } from "@/lib/orders";
import { notifyOrderPlaced } from "@/lib/notifications";
import {
  createRazorpayOrder,
  fetchOrderPayments,
  razorpayKeyId,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import { Cart } from "@/models/Cart";
import { Inventory } from "@/models/Inventory";
import { Order as OrderModel, type OrderDoc } from "@/models/Order";
import type { Order } from "@/lib/types";

/** Unpaid online orders hold stock for this long before it's released. */
export const PAYMENT_WINDOW_MINUTES = 30;

export interface CheckoutSession {
  keyId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: "INR";
  orderId: string;
  name: string;
  email: string;
  contact: string;
}

async function load(orderId: string): Promise<OrderDoc | null> {
  return OrderModel.findById(orderId).lean<OrderDoc>();
}

/** Puts the order's stock back and marks it cancelled. Only touches orders still waiting for payment. */
async function cancelPending(orderId: string): Promise<boolean> {
  const session = await mongoose.startSession();
  let cancelled = false;
  try {
    await session.withTransaction(async () => {
      cancelled = false;
      const res = await OrderModel.updateOne(
        { _id: orderId, paymentStatus: "pending" },
        { $set: { status: "cancelled", paymentStatus: "failed" } },
        { session },
      );
      if (res.modifiedCount === 0) return; // already paid or already cancelled
      const doc = await OrderModel.findById(orderId).session(session).lean<OrderDoc>();
      for (const l of doc?.lines ?? []) {
        await Inventory.updateOne({ _id: l.productId }, { $inc: { stock: l.qty } }, { session });
      }
      cancelled = true;
    });
  } finally {
    await session.endSession();
  }
  return cancelled;
}

/**
 * Records a successful payment. Safe to call more than once for the same payment.
 * If the order had already been cancelled (the customer paid after the window
 * closed), the stock is taken again and the order goes back to "placed".
 */
async function markPaid(doc: OrderDoc, paymentId: string): Promise<void> {
  if (doc.paymentStatus === "paid") return;
  let changed = false;

  if (doc.status === "cancelled") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const res = await OrderModel.updateOne(
          { _id: doc._id, status: "cancelled", paymentStatus: { $in: ["pending", "failed"] } },
          { $set: { status: "placed", paymentStatus: "paid", razorpayPaymentId: paymentId, paidAt: new Date() } },
          { session },
        );
        changed = false;
        if (res.modifiedCount === 0) return;
        for (const l of doc.lines) {
          await Inventory.updateOne({ _id: l.productId }, { $inc: { stock: -l.qty } }, { session });
        }
        changed = true;
      });
    } finally {
      await session.endSession();
    }
  } else {
    const res = await OrderModel.updateOne(
      { _id: doc._id, paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "paid", razorpayPaymentId: paymentId, paidAt: new Date() } },
    );
    changed = res.modifiedCount === 1;
  }
  if (doc.cartId) await Cart.deleteOne({ _id: doc.cartId });
  // the confirmation email goes out once, by whichever path recorded the payment first
  if (changed) {
    const fresh = await load(doc._id);
    if (fresh) await notifyOrderPlaced(toOrder(fresh));
  }
}

/** Asks Razorpay whether the order was paid. Marks it paid if so. */
async function reconcile(doc: OrderDoc): Promise<boolean> {
  if (!doc.razorpayOrderId) return false;
  const payments = await fetchOrderPayments(doc.razorpayOrderId);
  const ok = payments.find((p) => p.status === "captured" || p.status === "authorized");
  if (!ok) return false;
  await markPaid(doc, ok.id);
  return true;
}

/** Step 2: create the Razorpay order for an order that's waiting for payment. */
export async function startOnlinePayment(order: Order): Promise<CheckoutSession> {
  await connectDB();
  let rzp;
  try {
    rzp = await createRazorpayOrder({ amountInRupees: order.total, receipt: order.id, notes: { rumm_order: order.id } });
  } catch (err) {
    console.error(err);
    await cancelPending(order.id);
    throw new StoreError(
      "Online payment isn't available right now. Your bag hasn't changed: try again, or choose cash or UPI on delivery.",
      502,
    );
  }
  await OrderModel.updateOne({ _id: order.id }, { $set: { razorpayOrderId: rzp.id } });
  return {
    keyId: razorpayKeyId(),
    razorpayOrderId: rzp.id,
    amount: rzp.amount,
    currency: "INR",
    orderId: order.id,
    name: order.address.fullName,
    email: order.email,
    contact: order.address.phone,
  };
}

/** Step 3: Checkout reported success. Trust it only if the signature checks out. */
export async function confirmPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<Order> {
  await connectDB();
  const doc = await load(input.orderId);
  if (!doc) throw new StoreError("That order doesn't exist.", 404);
  if (!doc.razorpayOrderId || doc.razorpayOrderId !== input.razorpayOrderId) {
    throw new StoreError("This payment doesn't belong to that order.", 400);
  }
  if (!verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.signature)) {
    throw new StoreError(
      `We couldn't confirm this payment. If money left your account, contact us with order ${doc._id} and we'll sort it out.`,
      400,
    );
  }
  await markPaid(doc, input.razorpayPaymentId);
  return toOrder((await load(input.orderId))!);
}

/** Step 4: the customer closed Checkout. Gives the stock back unless Razorpay says it was paid. */
export async function cancelPayment(orderId: string): Promise<Order> {
  await connectDB();
  const doc = await load(orderId);
  if (!doc) throw new StoreError("That order doesn't exist.", 404);
  if (doc.paymentStatus === "pending") {
    let paid = false;
    try {
      paid = await reconcile(doc);
    } catch (err) {
      console.error("Couldn't check the payment with Razorpay; cancelling anyway", err);
    }
    if (!paid) await cancelPending(orderId);
  }
  return toOrder((await load(orderId))!);
}

/** Webhook: payment.captured or order.paid from Razorpay. */
export async function paymentCaptured(razorpayOrderId: string, paymentId: string, amountPaise: number): Promise<boolean> {
  await connectDB();
  const doc = await OrderModel.findOne({ razorpayOrderId }).lean<OrderDoc>();
  if (!doc) return false;
  if (amountPaise !== Math.round(doc.total * 100)) {
    console.error(`Razorpay amount ${amountPaise} doesn't match order ${doc._id} total ${doc.total}`);
    return false;
  }
  await markPaid(doc, paymentId);
  return true;
}

let lastSweep = 0;

/**
 * Releases stock held by online orders that were never paid. Runs at most once
 * a minute per server process; called before new orders and on the admin pages.
 */
export async function releaseStalePayments(now = Date.now()): Promise<number> {
  if (now - lastSweep < 60_000) return 0;
  lastSweep = now;
  await connectDB();
  const cutoff = new Date(now - PAYMENT_WINDOW_MINUTES * 60_000);
  const stale = await OrderModel.find({ paymentStatus: "pending", createdAt: { $lt: cutoff } }).lean<OrderDoc[]>();
  let released = 0;
  for (const doc of stale) {
    try {
      if (await reconcile(doc)) continue;
      if (await cancelPending(doc._id)) released++;
    } catch (err) {
      console.error(`Couldn't check payment for ${doc._id}; will try again later`, err);
    }
  }
  return released;
}

/** For tests: let the sweep run again straight away. */
export function resetSweepTimer() {
  lastSweep = 0;
}
