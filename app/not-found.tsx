import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty empty-page">
      <h1 className="page-title">We couldn&apos;t find that page</h1>
      <p>The link may be old, or the product may have been retired.</p>
      <Link href="/shop" className="btn btn-primary">
        Go to the shop
      </Link>
    </div>
  );
}
