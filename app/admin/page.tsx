import Link from "next/link";
import { overview } from "@/lib/adminData";
import { formatINR } from "@/lib/pricing";

export default async function AdminOverview() {
  const o = await overview();
  return (
    <>
      <h1 className="page-title">Overview</h1>

      <dl className="stats">
        <div>
          <dt>Orders in the last 7 days</dt>
          <dd>{o.ordersThisWeek}</dd>
        </div>
        <div>
          <dt>Sales in the last 7 days</dt>
          <dd>{formatINR(o.revenueThisWeek)}</dd>
        </div>
        <div>
          <dt>Waiting to be shipped</dt>
          <dd>
            <Link href="/admin/orders?status=placed">{o.toShip}</Link>
          </dd>
        </div>
      </dl>

      <section className="admin-section" aria-labelledby="low-title">
        <h2 id="low-title" className="section-title">
          Running low
        </h2>
        {o.lowStock.length === 0 ? (
          <p className="admin-empty">Every product has 10 or more in stock.</p>
        ) : (
          <ul className="low-stock">
            {o.lowStock.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`}>
                  <span>
                    <strong>{p.name}</strong> {p.type.toLowerCase()}
                  </span>
                  <span className={p.stock === 0 ? "stock-out" : "stock-low"}>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
