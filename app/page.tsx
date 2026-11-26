import Link from "next/link";
import { RoomScene } from "@/components/RoomScene";
import { ProductCard } from "@/components/ProductCard";
import { ProductArt } from "@/components/ProductArt";
import { ROOMS, SHOWROOM_IDS } from "@/data/products";
import { listProducts } from "@/lib/products";
import { formatINR } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listProducts();
  const byId = new Map(products.map((p) => [p.id, p]));
  const showroom = SHOWROOM_IDS.map((id) => byId.get(id)).filter(Boolean) as Product[];
  const small = products.filter((p) => p.price < 4000).sort((a, b) => a.price - b.price);

  return (
    <>
      <RoomScene products={showroom} />

      <section className="rooms-index" aria-labelledby="rooms-title">
        <h2 id="rooms-title" className="section-title">
          Shop by room
        </h2>
        <ul>
          {ROOMS.map((r) => {
            const items = products.filter((p) => p.room === r.id);
            if (items.length === 0) return null;
            const from = Math.min(...items.map((p) => p.price));
            const hero = items[0];
            return (
              <li key={r.id}>
                <Link href={`/shop?room=${r.id}`} className="room-row">
                  <span className="room-thumb" aria-hidden="true">
                    <ProductArt kind={hero.art} color={hero.colorways[0].hex} wood={hero.wood} />
                  </span>
                  <span className="room-name">{r.name}</span>
                  <span className="room-line">{r.line}</span>
                  <span className="room-from">
                    {items.length} pieces from <strong>{formatINR(from)}</strong>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rail-section" aria-labelledby="small-title">
        <div className="section-head">
          <h2 id="small-title" className="section-title">
            Under ₹4,000
          </h2>
          <Link href="/shop?max=4000&sort=price-asc" className="text-link">
            See all {small.length}
          </Link>
        </div>
        <div className="rail" tabIndex={0} aria-label="Products under ₹4,000, scroll sideways">
          {small.map((p) => (
            <ProductCard key={p.id} product={p} size="sm" />
          ))}
        </div>
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          From the box to the room
        </h2>
        <ol>
          <li>
            <h3>Order today</h3>
            <p>Pay when it arrives, in cash or by UPI. No card needed.</p>
          </li>
          <li>
            <h3>It arrives flat in three working days</h3>
            <p>Boxes are sized to fit in a lift and up a stairwell. Delivery is free over ₹4,999.</p>
          </li>
          <li>
            <h3>Build it, or let us</h3>
            <p>Every part is labelled and the instructions are pictures. Or add assembly at checkout and a fitter comes the next day.</p>
          </li>
        </ol>
      </section>
    </>
  );
}
