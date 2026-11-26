import type { Metadata } from "next";
import Link from "next/link";
import { ReviewVisibility } from "@/components/admin/ReviewVisibility";
import { Stars } from "@/components/Stars";
import { listAllProducts } from "@/lib/products";
import { listAllReviews } from "@/lib/reviews";

export const metadata: Metadata = { title: "Reviews" };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default async function AdminReviews() {
  const [reviews, products] = await Promise.all([listAllReviews(), listAllProducts()]);
  const name = new Map(products.map((p) => [p.id, { name: p.name, slug: p.slug }]));

  return (
    <>
      <h1 className="page-title">Reviews</h1>
      <p className="shop-sub">Hidden reviews disappear from the product page and its rating. Customers can still edit them.</p>
      {reviews.length === 0 ? (
        <p className="admin-empty">No reviews yet. They appear here once customers with delivered orders write them.</p>
      ) : (
        <ul className="admin-reviews">
          {reviews.map((r) => {
            const p = name.get(r.productId);
            return (
              <li key={r.id} data-hidden={r.hidden || undefined}>
                <div className="admin-review-head">
                  <Stars value={r.rating} size={14} />
                  <span>
                    {p ? (
                      <Link href={`/product/${p.slug}#reviews`} className="text-link">
                        {p.name}
                      </Link>
                    ) : (
                      r.productId
                    )}{" "}
                    by {r.name}, {day(r.createdAt)}
                  </span>
                  <ReviewVisibility id={r.id} hidden={r.hidden} />
                </div>
                {r.title && <strong>{r.title}</strong>}
                <p>{r.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
