import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { setReviewHidden } from "@/lib/reviews";
import { errorResponse, readJson } from "@/lib/session";

/** PATCH /api/admin/reviews/:id { hidden } → hide or show a review (admins only) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const { hidden } = await readJson<{ hidden: boolean }>(req);
    await setReviewHidden(id, hidden === true);
    return NextResponse.json({ id, hidden: hidden === true });
  } catch (err) {
    return errorResponse(err);
  }
}
