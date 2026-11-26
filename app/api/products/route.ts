import { NextResponse } from "next/server";
import { filterProducts } from "@/lib/catalog";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

/** GET /api/products?room=living&max=5000&sort=price-asc&q=lamp */
export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const products = filterProducts(await listProducts(), sp);
  return NextResponse.json({ products, count: products.length });
}
