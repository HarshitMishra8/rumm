import Link from "next/link";
import { ReviewForm } from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";
import type { RatingSummary, ReviewView } from "@/lib/reviews";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export function ProductReviews({
  productId,
  path,
  reviews,
  summary,
  signedIn,
  eligible,
  mine,
}: {
  productId: string;
  path: string;
  reviews: ReviewView[];
  summary: RatingSummary | null;
  signedIn: boolean;
  eligible: boolean;
  mine: ReviewView | null;
}) {
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="reviews-side">
        <h2 id="reviews-title" className="section-title">
          Reviews
        </h2>
        {summary ? (
          <>
            <p className="reviews-avg">
              <strong>{summary.avg.toFixed(1)}</strong>
              <Stars value={summary.avg} size={20} />
            </p>
            <p className="reviews-count">
              From {summary.count} {summary.count === 1 ? "customer" : "customers"} who bought it
            </p>
            <ul className="reviews-bars" aria-label="Ratings by star">
              {counts.map(({ n, c }) => (
                <li key={n}>
                  <span>{n} ★</span>
                  <span className="rating-bar">
                    <span style={{ transform: `scaleX(${c / summary.count})` }} />
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="reviews-count">No reviews yet. Reviews come only from customers whose order has been delivered.</p>
        )}
      </div>

      <div className="reviews-main">
        {eligible ? (
          <ReviewForm productId={productId} existing={mine} />
        ) : (
          <p className="reviews-note">
            {signedIn ? (
              "You can review this once an order with it has been delivered to you."
            ) : (
              <>
                <Link href={`/account?next=${encodeURIComponent(path)}`} className="text-link">
                  Sign in
                </Link>{" "}
                to review a product you&apos;ve bought.
              </>
            )}
          </p>
        )}

        {reviews.length > 0 && (
          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r.id}>
                <div className="review-head">
                  <Stars value={r.rating} size={14} />
                  {r.title && <strong>{r.title}</strong>}
                </div>
                <p className="review-body">{r.body}</p>
                <p className="review-meta">
                  {r.name}, {date(r.createdAt)}
                  {r.edited && " (edited)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
