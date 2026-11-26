import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { listProducts } from "@/lib/products";
import { currentUser } from "@/lib/session";
import { getWishlist } from "@/lib/wishlist";

export const metadata: Metadata = { title: "Saved items" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await currentUser();
  if (!user) redirect("/account?next=/saved");
  const [ids, products] = await Promise.all([getWishlist(user.id), listProducts()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  // newest saves first; products that were hidden since are left out
  const saved = [...ids].reverse().flatMap((id) => byId.get(id) ?? []);

  return (
    <div className="shop">
      <header className="shop-head">
        <div>
          <h1 className="page-title">Saved items</h1>
          <p className="shop-sub">
            {saved.length === 0 ? "Nothing saved yet." : `${saved.length} ${saved.length === 1 ? "piece" : "pieces"} you liked.`}
          </p>
        </div>
      </header>
      {saved.length === 0 ? (
        <div className="empty">
          <p>Tap the heart on any product to keep it here while you decide.</p>
          <Link href="/shop" className="btn btn-primary">
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="grid">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
