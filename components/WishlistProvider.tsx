"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";

interface WishlistCtx {
  ids: Set<string>;
  signedIn: boolean;
  toggle: (productId: string, name: string) => Promise<void>;
}

const Ctx = createContext<WishlistCtx | null>(null);

export function useWishlist() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return v;
}

export function WishlistProvider({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const { notify } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!signedIn) {
      setIds(new Set());
      return;
    }
    fetch("/api/wishlist", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setIds(new Set(d.ids ?? [])))
      .catch(() => undefined);
  }, [signedIn]);

  const toggle = useCallback<WishlistCtx["toggle"]>(
    async (productId, name) => {
      if (!signedIn) {
        notify("Sign in to save items you like");
        router.push(`/account?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const saving = !ids.has(productId);
      // show the change straight away, put it back if the server says no
      setIds((prev) => {
        const next = new Set(prev);
        if (saving) next.add(productId);
        else next.delete(productId);
        return next;
      });
      const res = await fetch("/api/wishlist", {
        method: saving ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIds((prev) => {
          const next = new Set(prev);
          if (saving) next.delete(productId);
          else next.add(productId);
          return next;
        });
        notify(data.error ?? "That couldn't be saved.");
        return;
      }
      setIds(new Set(data.ids));
      notify(saving ? `${name} saved` : `${name} removed from saved`);
    },
    [ids, signedIn, notify, router, pathname],
  );

  return <Ctx.Provider value={{ ids, signedIn, toggle }}>{children}</Ctx.Provider>;
}
