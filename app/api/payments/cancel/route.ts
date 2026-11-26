import { NextResponse } from "next/server";
import { cancelPayment } from "@/lib/payments";
import { getOrder } from "@/lib/store";
import { currentUser, errorResponse, readJson, recentOrderIds } from "@/lib/session";
import { StoreError } from "@/lib/errors";

/**
 * POST /api/payments/cancel { orderId }
 * Called when the customer closes Razorpay Checkout without paying.
 * Only the customer who placed the order can cancel it.
 */
export async function POST(req: Request) {
  try {
    const { orderId } = await readJson<{ orderId: string }>(req);
    const id = String(orderId ?? "");
    const [order, user, recent] = await Promise.all([getOrder(id), currentUser(), recentOrderIds()]);
    if (!order || !((user && order.userId === user.id) || recent.includes(id))) {
      throw new StoreError("That order doesn't exist.", 404);
    }
    return NextResponse.json({ order: await cancelPayment(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
