import { ROOMS } from "@/data/products";
import type { Product, Room } from "@/lib/types";

export type SortKey = "featured" | "price-asc" | "price-desc" | "name";

export interface ShopQuery {
  room?: string;
  max?: string;
  sort?: string;
  q?: string;
}

/** Filters and sorts a product list for the shop page and the products API. */
export function filterProducts(products: Product[], query: ShopQuery): Product[] {
  const room = ROOMS.some((r) => r.id === query.room) ? (query.room as Room) : undefined;
  const max = query.max ? Number(query.max) : undefined;
  const q = (query.q ?? "").trim().toLowerCase();
  let list = products.filter(
    (p) =>
      (!room || p.room === room) &&
      (!max || p.price <= max) &&
      (!q || `${p.name} ${p.type} ${p.blurb} ${p.material}`.toLowerCase().includes(q)),
  );
  switch (query.sort as SortKey) {
    case "price-asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "name":
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return list;
}

export function related(p: Product, products: Product[], n = 4): Product[] {
  const same = products.filter((x) => x.room === p.room && x.id !== p.id);
  const other = products.filter((x) => x.room !== p.room && x.id !== p.id);
  return [...same, ...other].slice(0, n);
}
