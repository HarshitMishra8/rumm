import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForms, SignOutButton } from "@/components/AuthForms";
import { currentUser } from "@/lib/session";
import { ordersForUser } from "@/lib/store";
import { formatDay, formatINR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="account-page account-signed-out">
        <div>
          <h1 className="page-title">Your account</h1>
          <p className="lede">Sign in to see your orders and check out faster. You can also check out as a guest.</p>
        </div>
        <Suspense>
          <AuthForms />
        </Suspense>
      </div>
    );
  }

  const orders = await ordersForUser(user.id);
  return (
    <div className="account-page">
      <header className="account-head">
        <div>
          <h1 className="page-title">Hello, {user.name.split(" ")[0]}</h1>
          <p className="shop-sub">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <h2 className="section-title">Your orders</h2>
      {orders.length === 0 ? (
        <div className="empty">
          <p>You haven&apos;t ordered anything yet.</p>
          <Link className="btn btn-primary" href="/shop">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="orders">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="order-row">
                <span className="order-id">{o.id}</span>
                <span>{o.lines.reduce((n, l) => n + l.qty, 0)} items</span>
                <span>Arrives by {formatDay(o.deliverBy)}</span>
                <span className="price">{formatINR(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
