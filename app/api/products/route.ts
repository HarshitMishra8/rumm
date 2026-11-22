import { NextResponse } from "next/server";
import { filterProducts } from "@/lib/catalog";
import { getStockMap } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/products?room=living&max=5000&sort=price-asc&q=lamp */
export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const stock = await getStockMap();
  const products = filterProducts(sp).map((p) => ({ ...p, stock: stock[p.id] ?? p.stock }));
  return NextResponse.json({ products, count: products.length });
}
