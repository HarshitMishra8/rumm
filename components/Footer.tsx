import Link from "next/link";
import { ROOMS } from "@/data/products";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="footer-brand">rumm</p>
          <p>Flat-pack furniture, designed to be carried up the stairs and lived with for a long time.</p>
        </div>
        <nav aria-label="Shop by room">
          <h2>Rooms</h2>
          <ul>
            {ROOMS.map((r) => (
              <li key={r.id}>
                <Link href={`/shop?room=${r.id}`}>{r.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Help">
          <h2>Help</h2>
          <ul>
            <li>
              <Link href="/account">Your orders</Link>
            </li>
            <li>Delivery in 3 working days</li>
            <li>Free delivery over ₹4,999</li>
            <li>365-day returns, unopened or assembled</li>
          </ul>
        </nav>
      </div>
      <p className="footer-legal">© {new Date().getFullYear()} Rumm Home. Prices include GST.</p>
    </footer>
  );
}
