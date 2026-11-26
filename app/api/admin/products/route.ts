import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { createProduct } from "@/lib/adminData";
import { parseProductInput } from "@/lib/productInput";
import { errorResponse, readJson } from "@/lib/session";

/** POST /api/admin/products → create a product (admins only) */
export async function POST(req: Request) {
  try {
    await requireAdminApi();
    const product = await createProduct(parseProductInput(await readJson(req)));
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
