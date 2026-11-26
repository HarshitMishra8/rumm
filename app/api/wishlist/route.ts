import { NextResponse } from "next/server";
import { getWishlist, saveProduct, unsaveProduct } from "@/lib/wishlist";
import { currentUser, errorResponse, readJson } from "@/lib/session";
import { StoreError } from "@/lib/errors";

export const dynamic = "force-dynamic";

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new StoreError("Sign in to save items.", 401);
  return user;
}

/** GET /api/wishlist → { ids } (empty for signed-out visitors) */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ ids: user ? await getWishlist(user.id) : [] });
}

/** POST /api/wishlist { productId } → save */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { productId } = await readJson<{ productId: string }>(req);
    return NextResponse.json({ ids: await saveProduct(user.id, String(productId ?? "")) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/wishlist { productId } → remove */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const { productId } = await readJson<{ productId: string }>(req);
    return NextResponse.json({ ids: await unsaveProduct(user.id, String(productId ?? "")) });
  } catch (err) {
    return errorResponse(err);
  }
}
