import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { ORDER_STATUSES, listOrders } from "@/lib/adminData";
import { formatINR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Orders" };

const TABS = [
  { v: "", label: "All" },
  { v: "placed", label: "Placed" },
  { v: "packed", label: "Packed" },
  { v: "shipped", label: "On the way" },
  { v: "delivered", label: "Delivered" },
];

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const current = ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number]) ? status! : "";
  const orders = await listOrders(current || undefined);

  return (
    <>
      <h1 className="page-title">Orders</h1>
      <nav className="tabs" aria-label="Filter orders by status">
        {TABS.map((t) => (
          <Link key={t.v} href={t.v ? `/admin/orders?status=${t.v}` : "/admin/orders"} aria-current={t.v === current ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="admin-empty">No orders here yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col" className="hide-sm">
                  Customer
                </th>
                <th scope="col" className="hide-sm">
                  Placed
                </th>
                <th scope="col" className="hide-sm">
                  Deliver by
                </th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.id}`} className="order-id">
                      {o.id}
                    </Link>
                    <small className="cell-sub">
                      {o.items} {o.items === 1 ? "item" : "items"}
                    </small>
                  </td>
                  <td className="hide-sm">
                    {o.name}
                    <small className="cell-sub">
                      {o.city} · {o.email}
                    </small>
                  </td>
                  <td className="hide-sm">{day(o.createdAt)}</td>
                  <td className="hide-sm">{day(o.deliverBy)}</td>
                  <td className="num">
                    {formatINR(o.total)}
                    <small className="cell-sub">{o.payment === "cod" ? "Cash" : "UPI"} on delivery</small>
                  </td>
                  <td>
                    <OrderStatusSelect orderId={o.id} status={o.status as (typeof ORDER_STATUSES)[number]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
