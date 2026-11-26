import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { setOrderStatus } from "@/lib/adminData";
import { errorResponse, readJson } from "@/lib/session";

/** PATCH /api/admin/orders/:id { status } → move an order along (admins only) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const body = await readJson<{ status: string }>(req);
    const status = await setOrderStatus(id, String(body.status ?? ""));
    return NextResponse.json({ id, status });
  } catch (err) {
    return errorResponse(err);
  }
}
