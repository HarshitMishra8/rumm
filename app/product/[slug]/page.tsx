import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetail } from "@/components/ProductDetail";
import { ROOMS } from "@/data/products";
import { related } from "@/lib/catalog";
import { getProductBySlug, listProducts } from "@/lib/products";

export const dynamic = "force-dynamic"; // product and stock are read live from the database

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  return p ? { title: `${p.name} ${p.type.toLowerCase()}`, description: p.blurb } : {};
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: Promise<{ c?: string }> }) {
  const { slug } = await params;
  const { c } = await searchParams;
  const [product, all] = await Promise.all([getProductBySlug(slug), listProducts()]);
  if (!product) notFound();
  const stock = product.stock;
  const room = ROOMS.find((r) => r.id === product.room) ?? ROOMS[0];

  return (
    <div className="product-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/shop?room=${room.id}`}>{room.name}</Link>
      </nav>
      <ProductDetail product={product} initialColorway={c} stock={stock} />

      <section className="rail-section" aria-labelledby="related-title">
        <h2 id="related-title" className="section-title">
          Goes well with
        </h2>
        <div className="rail">
          {related(product, all).map((p) => (
            <ProductCard key={p.id} product={p} size="sm" />
          ))}
        </div>
      </section>
    </div>
  );
}
