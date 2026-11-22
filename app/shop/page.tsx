import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilters } from "@/components/ShopFilters";
import { ROOMS } from "@/data/products";
import { filterProducts } from "@/lib/catalog";

type SP = Promise<{ room?: string; max?: string; sort?: string; q?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const room = ROOMS.find((r) => r.id === sp.room);
  return { title: room ? room.name : sp.q ? `Search: ${sp.q}` : "Shop everything" };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const room = ROOMS.find((r) => r.id === sp.room);
  const products = filterProducts(sp);
  const title = sp.q ? `Results for “${sp.q}”` : room ? room.name : "Everything";

  return (
    <div className="shop">
      <header className="shop-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="shop-sub">
            {room?.line ?? "Every piece we make, in every room."} {products.length} {products.length === 1 ? "piece" : "pieces"}.
          </p>
        </div>
        <Suspense>
          <ShopFilters />
        </Suspense>
      </header>

      {products.length === 0 ? (
        <div className="empty">
          <p>Nothing matches those filters. Try a higher price limit or a different room.</p>
          <Link href="/shop" className="btn btn-quiet">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
