import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/store";
import { currentUser, recentOrderIds } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { formatDay, formatINR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

const STEPS = ["placed", "packed", "shipped", "delivered"] as const;
const STEP_LABEL = { placed: "Order placed", packed: "Packed", shipped: "On the way", delivered: "Delivered" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, user, recent] = await Promise.all([getOrder(id), currentUser(), recentOrderIds()]);
  // only the customer who placed it (signed in, or on this browser) or an admin can see an order
  if (!order || !((user && order.userId === user.id) || recent.includes(order.id) || isAdmin(user))) notFound();
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <div className="order-page">
      <div className="order-hero">
        <svg className="order-tick" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M19 33l9 9 17-19" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="page-title">Thank you, {order.address.fullName.split(" ")[0]}. Your order is placed.</h1>
        <p className="lede">
          It arrives by <strong>{formatDay(order.deliverBy)}</strong>. We&apos;ve sent the details to {order.email}, and the driver will
          call {order.address.phone} before they come.
        </p>
      </div>

      <ol className="tracker" aria-label="Order progress">
        {STEPS.map((s, i) => (
          <li key={s} data-done={i <= stepIndex || undefined}>
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      <div className="order-grid">
        <section aria-labelledby="items-title">
          <h2 id="items-title" className="section-title">
            Order {order.id}
          </h2>
          <ul className="order-lines">
            {order.lines.map((l) => (
              <li key={`${l.productId}-${l.colorway}`}>
                <span>
                  {l.qty} × {l.name}
                  <small>{l.colorway}</small>
                </span>
                <span>{formatINR(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="order-sums">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{order.delivery === 0 ? "Free" : formatINR(order.delivery)}</dd>
            </div>
            {order.assembly > 0 && (
              <div>
                <dt>Assembly</dt>
                <dd>{formatINR(order.assembly)}</dd>
              </div>
            )}
            <div className="summary-total">
              <dt>{order.payment === "cod" ? "Pay in cash on delivery" : "Pay by UPI on delivery"}</dt>
              <dd className="price">{formatINR(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="addr-title" className="order-addr">
          <h2 id="addr-title" className="section-title">
            Delivering to
          </h2>
          <address>
            {order.address.fullName}
            <br />
            {order.address.line1}
            {order.address.line2 && (
              <>
                <br />
                {order.address.line2}
              </>
            )}
            <br />
            {order.address.city} {order.address.pin}
          </address>
          <Link href="/shop" className="btn btn-quiet">
            Keep shopping
          </Link>
        </section>
      </div>
    </div>
  );
}
