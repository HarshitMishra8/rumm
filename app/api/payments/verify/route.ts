import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments";
import { errorResponse, readJson } from "@/lib/session";

/**
 * POST /api/payments/verify
 * Body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Called by the checkout page when Razorpay reports success.
 */
export async function POST(req: Request) {
  try {
    const b = await readJson<{
      orderId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }>(req);
    const order = await confirmPayment({
      orderId: String(b.orderId ?? ""),
      razorpayOrderId: String(b.razorpay_order_id ?? ""),
      razorpayPaymentId: String(b.razorpay_payment_id ?? ""),
      signature: String(b.razorpay_signature ?? ""),
    });
    return NextResponse.json({ order });
  } catch (err) {
    return errorResponse(err);
  }
}
