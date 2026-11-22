import { NextResponse } from "next/server";
import { ordersForUser, placeOrder } from "@/lib/store";
import { cartId, currentUser, errorResponse, readJson, rememberOrder } from "@/lib/session";
import type { Address, DeliveryOption, PaymentOption } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/orders → orders for the signed-in customer */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your orders." }, { status: 401 });
  return NextResponse.json({ orders: await ordersForUser(user.id) });
}

/** POST /api/orders → place an order from the current bag */
export async function POST(req: Request) {
  try {
    const body = await readJson<{
      email: string;
      address: Address;
      deliveryOption: DeliveryOption;
      payment: PaymentOption;
    }>(req);
    const order = await placeOrder({
      cartId: await cartId(),
      user: await currentUser(),
      email: body.email,
      address: body.address ?? {},
      deliveryOption: body.deliveryOption ?? "standard",
      payment: body.payment ?? "cod",
    });
    await rememberOrder(order.id);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
