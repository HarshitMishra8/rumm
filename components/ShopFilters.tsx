"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const PRICES = [
  { v: "", label: "Any price" },
  { v: "2000", label: "Under ₹2,000" },
  { v: "5000", label: "Under ₹5,000" },
  { v: "10000", label: "Under ₹10,000" },
  { v: "20000", label: "Under ₹20,000" },
];

const SORTS = [
  { v: "", label: "Featured" },
  { v: "price-asc", label: "Price, low to high" },
  { v: "price-desc", label: "Price, high to low" },
  { v: "name", label: "Name" },
];

export function ShopFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`/shop?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="filters" data-pending={pending || undefined}>
      <label>
        <span>Price</span>
        <select value={params.get("max") ?? ""} onChange={(e) => set("max", e.target.value)}>
          {PRICES.map((p) => (
            <option key={p.v} value={p.v}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Sort</span>
        <select value={params.get("sort") ?? ""} onChange={(e) => set("sort", e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
