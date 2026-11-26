import { NextResponse } from "next/server";
import { paymentCaptured } from "@/lib/payments";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

interface WebhookBody {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; status: string } } };
}

/**
 * POST /api/payments/webhook
 * Razorpay calls this when a payment is captured, even if the customer closed
 * the tab. Set it up in Razorpay → Settings → Webhooks with the events
 * payment.captured and order.paid, and the same secret as RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  // the signature covers the exact bytes Razorpay sent, so read the raw body
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = body.payload?.payment?.entity;
  if ((body.event === "payment.captured" || body.event === "order.paid") && payment?.order_id) {
    try {
      await paymentCaptured(payment.order_id, payment.id, payment.amount);
    } catch (err) {
      console.error(err);
      // a non-2xx answer makes Razorpay retry later
      return NextResponse.json({ error: "Try again" }, { status: 500 });
    }
  }
  // acknowledge everything else so Razorpay doesn't keep retrying
  return NextResponse.json({ ok: true });
}
