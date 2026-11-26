import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { updateProduct } from "@/lib/adminData";
import { parseProductInput } from "@/lib/productInput";
import { errorResponse, readJson } from "@/lib/session";

/** PATCH /api/admin/products/:id → save every field of a product (admins only) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const product = await updateProduct(id, parseProductInput(await readJson(req)));
    return NextResponse.json({ product });
  } catch (err) {
    return errorResponse(err);
  }
}
