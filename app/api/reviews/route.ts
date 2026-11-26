import { NextResponse } from "next/server";
import { saveReview } from "@/lib/reviews";
import { currentUser, errorResponse, readJson } from "@/lib/session";
import { StoreError } from "@/lib/errors";

/** POST /api/reviews { productId, rating, title, body } → create or edit your review */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new StoreError("Sign in to write a review.", 401);
    const review = await saveReview(user, await readJson(req));
    return NextResponse.json({ review });
  } catch (err) {
    return errorResponse(err);
  }
}
