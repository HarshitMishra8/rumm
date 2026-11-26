"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { ROOMS } from "@/data/products";

export function Header({ userName, isAdmin = false }: { userName: string | null; isAdmin?: boolean }) {
  const { cart, setOpen, ready } = useCart();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeRoom = pathname === "/shop" ? params.get("room") : null;

  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="site-header">
        <div className="bar">
          <Link href="/" className="wordmark" aria-label="Rumm home">
            <svg viewBox="0 0 120 36" aria-hidden="true">
              <path d="M4 34 V16 L14 8 L24 16 V34" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
              <text x="30" y="30" fontSize="30" fontWeight="700" letterSpacing="-1.5" fill="currentColor" style={{ fontFamily: "var(--font-sans)" }}>
                rumm
              </text>
            </svg>
          </Link>

          <form action="/shop" className="search" role="search">
            <label htmlFor="q" className="sr-only">
              Search products
            </label>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input id="q" name="q" type="search" placeholder="Search sofas, lamps, mugs…" defaultValue={params.get("q") ?? ""} />
          </form>

          <nav className="tools" aria-label="Account and bag">
            {isAdmin && (
              <Link href="/admin" className="tool-link tool-admin">
                Admin
              </Link>
            )}
            <Link href="/account" className="tool-link">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>{userName ? userName.split(" ")[0] : "Sign in"}</span>
            </Link>
            <button
              id="bag-button"
              type="button"
              className="bag-btn"
              onClick={() => setOpen(true)}
              aria-label={`Open bag, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path d="M5 8h14l-1.2 12H6.2L5 8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M9 8V6.5a3 3 0 016 0V8" fill="none" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              {ready && cart.count > 0 && (
                <span className="bag-count" key={cart.count}>
                  {cart.count}
                </span>
              )}
            </button>
          </nav>
        </div>

        <nav className="rooms-nav" aria-label="Rooms">
          <Link href="/shop" aria-current={pathname === "/shop" && !activeRoom ? "page" : undefined}>
            Everything
          </Link>
          {ROOMS.map((r) => (
            <Link key={r.id} href={`/shop?room=${r.id}`} aria-current={activeRoom === r.id ? "page" : undefined}>
              {r.name}
            </Link>
          ))}
        </nav>
      </header>
      <CartDrawer />
    </>
  );
}
