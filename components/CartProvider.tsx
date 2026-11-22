"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CartView } from "@/lib/types";

type AddItem = { productId: string; colorwayId?: string; qty?: number };

interface CartCtx {
  cart: CartView;
  ready: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (items: AddItem | AddItem[], origin?: Element | null) => Promise<boolean>;
  setQty: (productId: string, colorwayId: string, qty: number) => Promise<void>;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
}

const EMPTY: CartView = { lines: [], count: 0, subtotal: 0 };
const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lifts a copy of the product art and drops it into the bag along an arc. */
function flyToBag(origin: Element) {
  const bag = document.getElementById("bag-button");
  if (!bag || reduceMotion()) return Promise.resolve();
  const from = origin.getBoundingClientRect();
  const to = bag.getBoundingClientRect();
  if (from.width === 0) return Promise.resolve();

  const ghost = origin.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "100",
    pointerEvents: "none",
    transformOrigin: "center",
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const end = Math.max(0.06, 28 / from.width);
  const lift = Math.min(160, Math.abs(dy) * 0.35 + 60);

  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.12}px, ${-lift * 0.35}px) scale(1.04) rotate(-3deg)`, opacity: 1, offset: 0.18 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - lift}px) scale(${(1 + end) / 2.2}) rotate(4deg)`, opacity: 0.95, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end}) rotate(10deg)`, opacity: 0.4 },
    ],
    { duration: 760, easing: "cubic-bezier(.45,.05,.35,1)" },
  );
  return anim.finished.then(() => {
    ghost.remove();
    bag.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.22) rotate(-6deg)" },
        { transform: "scale(.94) rotate(3deg)" },
        { transform: "scale(1)" },
      ],
      { duration: 420, easing: "cubic-bezier(.3,1.6,.5,1)" },
    );
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView>(EMPTY);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.ok) setCart(await res.json());
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback<CartCtx["add"]>(
    async (items, origin) => {
      const list = Array.isArray(items) ? items : [items];
      const flight = origin ? flyToBag(origin) : Promise.resolve();
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list }),
      });
      const data = await res.json();
      await flight;
      if (!res.ok) {
        notify(data.error ?? "That couldn't be added to your bag.");
        return false;
      }
      setCart(data);
      const added = list.reduce((n, i) => n + (i.qty ?? 1), 0);
      notify(added === 1 ? "Added to your bag" : `${added} items added to your bag`);
      return true;
    },
    [notify],
  );

  const setQty = useCallback<CartCtx["setQty"]>(
    async (productId, colorwayId, qty) => {
      // optimistic update so steppers feel instant
      setCart((c) => {
        const lines = c.lines
          .map((l) =>
            l.productId === productId && l.colorwayId === colorwayId
              ? { ...l, qty, lineTotal: l.product.price * qty }
              : l,
          )
          .filter((l) => l.qty > 0);
        return { lines, count: lines.reduce((n, l) => n + l.qty, 0), subtotal: lines.reduce((n, l) => n + l.lineTotal, 0) };
      });
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, colorwayId, qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error ?? "That change couldn't be saved.");
        await refresh();
        return;
      }
      setCart(data);
    },
    [notify, refresh],
  );

  return (
    <Ctx.Provider value={{ cart, ready, open, setOpen, add, setQty, notify, refresh }}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            {toast.message}
            {toast.message.startsWith("Added") || toast.message.includes("added") ? (
              <button type="button" onClick={() => setOpen(true)}>
                View bag
              </button>
            ) : null}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
