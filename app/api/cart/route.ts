import { NextResponse } from "next/server";
import { addToCart, getCart, setLineQty } from "@/lib/store";
import { cartId, ensureCartId, errorResponse, readJson } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/cart → the current bag */
export async function GET() {
  return NextResponse.json(await getCart(await cartId()));
}

type AddBody = {
  productId?: string;
  colorwayId?: string;
  qty?: number;
  items?: { productId: string; colorwayId?: string; qty?: number }[];
};

/** POST /api/cart { productId, colorwayId, qty } or { items: [...] } → add */
export async function POST(req: Request) {
  try {
    const body = await readJson<AddBody>(req);
    const items = body.items ?? (body.productId ? [{ productId: body.productId, colorwayId: body.colorwayId, qty: body.qty }] : []);
    if (items.length === 0) return NextResponse.json({ error: "Choose a product to add." }, { status: 400 });
    const id = await ensureCartId();
    return NextResponse.json(await addToCart(id, items));
  } catch (err) {
    return errorResponse(err);
  }
}

/** PATCH /api/cart { productId, colorwayId, qty } → set quantity (0 removes) */
export async function PATCH(req: Request) {
  try {
    const body = await readJson<{ productId: string; colorwayId: string; qty: number }>(req);
    const id = await ensureCartId();
    return NextResponse.json(await setLineQty(id, String(body.productId), String(body.colorwayId), Number(body.qty)));
  } catch (err) {
    return errorResponse(err);
  }
}
