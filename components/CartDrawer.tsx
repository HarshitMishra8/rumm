"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ProductArt } from "@/components/ProductArt";
import { FREE_DELIVERY_FROM, formatINR } from "@/lib/pricing";

export function CartDrawer() {
  const { cart, open, setOpen, setQty } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  // keep mounted during the closing animation
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!mounted) return null;

  const toFree = FREE_DELIVERY_FROM - cart.subtotal;
  const progress = Math.min(1, cart.subtotal / FREE_DELIVERY_FROM);

  return (
    <div
      className="drawer"
      data-state={open ? "open" : "closed"}
      onAnimationEnd={(e) => {
        if (!open && e.target === panel.current) setMounted(false);
      }}
    >
      <div className="drawer-scrim" onClick={() => setOpen(false)} />
      <div
        ref={panel}
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        <header className="drawer-head">
          <h2 id="drawer-title">Your bag</h2>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close bag">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <div className="drawer-empty">
            <p>Your bag is empty. Start with a room and work out from there.</p>
            <Link className="btn btn-primary" href="/shop?room=living" onClick={() => setOpen(false)}>
              Shop the living room
            </Link>
          </div>
        ) : (
          <>
            <div className="free-delivery" aria-live="polite">
              <p>
                {toFree > 0 ? (
                  <>Add {formatINR(toFree)} more for free delivery</>
                ) : (
                  <>Your delivery is free</>
                )}
              </p>
              <div className="meter">
                <span style={{ transform: `scaleX(${progress})` }} />
              </div>
            </div>

            <ul className="drawer-lines">
              {cart.lines.map((l) => (
                <li key={`${l.productId}-${l.colorwayId}`} className="drawer-line">
                  <Link href={`/product/${l.product.slug}`} className="drawer-thumb" onClick={() => setOpen(false)}>
                    <ProductArt kind={l.product.art} color={l.colorway.hex} wood={l.product.wood} />
                  </Link>
                  <div className="drawer-info">
                    <p className="line-name">
                      <strong>{l.product.name}</strong> {l.product.type.toLowerCase()}
                    </p>
                    <p className="line-meta">{l.colorway.name}</p>
                    <div className="stepper" aria-label={`Quantity of ${l.product.name}`}>
                      <button
                        type="button"
                        onClick={() => setQty(l.productId, l.colorwayId, l.qty - 1)}
                        aria-label={l.qty === 1 ? `Remove ${l.product.name}` : "One fewer"}
                      >
                        {l.qty === 1 ? (
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                            <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          "−"
                        )}
                      </button>
                      <output>{l.qty}</output>
                      <button type="button" onClick={() => setQty(l.productId, l.colorwayId, l.qty + 1)} aria-label="One more">
                        +
                      </button>
                    </div>
                  </div>
                  <p className="line-total">{formatINR(l.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <footer className="drawer-foot">
              <div className="drawer-sum">
                <span>Subtotal</span>
                <strong>{formatINR(cart.subtotal)}</strong>
              </div>
              <Link className="btn btn-primary btn-block" href="/checkout" onClick={() => setOpen(false)}>
                Check out
              </Link>
              <p className="fine">Pay on delivery by cash or UPI. Delivery in 3 working days.</p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
