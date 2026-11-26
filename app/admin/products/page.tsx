import type { Metadata } from "next";
import Link from "next/link";
import { ProductArt } from "@/components/ProductArt";
import { ROOMS } from "@/data/products";
import { listAllProducts } from "@/lib/products";
import { formatINR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProducts() {
  const products = await listAllProducts();
  const roomName = (id: string) => ROOMS.find((r) => r.id === id)?.name ?? id;

  return (
    <>
      <div className="admin-title-row">
        <h1 className="page-title">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          Add product
        </Link>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col" className="hide-sm">
                Room
              </th>
              <th scope="col" className="num">
                Price
              </th>
              <th scope="col" className="num">
                Stock
              </th>
              <th scope="col">Shop</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} data-hidden={!p.active || undefined}>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="admin-product">
                    <span className="admin-thumb" aria-hidden="true">
                      <ProductArt kind={p.art} color={p.colorways[0].hex} wood={p.wood} />
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.type}</small>
                    </span>
                  </Link>
                </td>
                <td className="hide-sm">{roomName(p.room)}</td>
                <td className="num">{formatINR(p.price)}</td>
                <td className={`num ${p.stock === 0 ? "stock-out" : p.stock < 10 ? "stock-low" : ""}`}>{p.stock}</td>
                <td>{p.active ? "Shown" : "Hidden"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
