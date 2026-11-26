/**
 * Checks and cleans product data sent from the admin form.
 * Every message names the field so the admin knows what to fix.
 */
import { ROOMS } from "@/data/products";
import { ART_KINDS } from "@/components/ProductArt";
import { StoreError } from "@/lib/errors";
import type { ArtKind, Colorway, Product, Room } from "@/lib/types";

export const BADGES = ["New", "Lower price", "Last few"] as const;

export interface ProductInput {
  slug: string;
  name: string;
  type: string;
  room: Room;
  art: ArtKind;
  price: number;
  wasPrice: number | null;
  badge: Product["badge"] | null;
  blurb: string;
  description: string;
  details: string[];
  dimensions: { w: number; d: number; h: number };
  material: string;
  wood: string;
  colorways: Colorway[];
  pieces: number;
  assemblyMinutes: number;
  active: boolean;
  sortOrder: number;
  stock: number;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function text(v: unknown, label: string, min: number, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length < min) throw new StoreError(min <= 1 ? `Enter the ${label}.` : `${label[0].toUpperCase() + label.slice(1)} needs at least ${min} characters.`);
  if (s.length > max) throw new StoreError(`${label[0].toUpperCase() + label.slice(1)} can be at most ${max} characters.`);
  return s;
}

function int(v: unknown, label: string, min: number, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new StoreError(`${label[0].toUpperCase() + label.slice(1)} must be a whole number from ${min} to ${max.toLocaleString("en-IN")}.`);
  }
  return n;
}

export function parseProductInput(body: unknown): ProductInput {
  const b = (body ?? {}) as Record<string, unknown>;

  const name = text(b.name, "name", 2, 40);
  const type = text(b.type, "product type", 2, 60);
  const slug = slugify(typeof b.slug === "string" && b.slug.trim() ? b.slug : `${name}-${type}`);
  if (slug.length < 3) throw new StoreError("The web address needs at least 3 letters or numbers.");

  if (!ROOMS.some((r) => r.id === b.room)) throw new StoreError("Choose a room.");
  if (!ART_KINDS.includes(b.art as ArtKind)) throw new StoreError("Choose an illustration.");

  const price = int(b.price, "price", 1, 10_000_000);
  const wasRaw = b.wasPrice === "" || b.wasPrice === null || b.wasPrice === undefined ? null : int(b.wasPrice, "was price", 1, 10_000_000);
  if (wasRaw !== null && wasRaw <= price) throw new StoreError("Was price must be higher than the price, or left empty.");

  const badge = b.badge === "" || b.badge == null ? null : (b.badge as ProductInput["badge"]);
  if (badge !== null && !BADGES.includes(badge as (typeof BADGES)[number])) throw new StoreError("Choose a badge from the list, or none.");

  const details = (Array.isArray(b.details) ? b.details : typeof b.details === "string" ? b.details.split("\n") : [])
    .map((d) => String(d).trim())
    .filter(Boolean);
  if (details.length > 8) throw new StoreError("Keep the details list to 8 lines or fewer.");
  if (details.some((d) => d.length > 120)) throw new StoreError("Each detail line can be at most 120 characters.");

  const dims = (b.dimensions ?? {}) as Record<string, unknown>;
  const dimensions = {
    w: int(dims.w, "width", 1, 1000),
    d: int(dims.d, "depth", 1, 1000),
    h: int(dims.h, "height", 1, 1000),
  };

  const wood = typeof b.wood === "string" ? b.wood.trim() : "";
  if (!HEX_RE.test(wood)) throw new StoreError("Timber colour must be a colour like #C9A27A.");

  const rawColors = Array.isArray(b.colorways) ? b.colorways : [];
  if (rawColors.length === 0) throw new StoreError("Add at least one colour.");
  if (rawColors.length > 8) throw new StoreError("A product can have at most 8 colours.");
  const seen = new Set<string>();
  const colorways: Colorway[] = rawColors.map((c, i) => {
    const cc = (c ?? {}) as Record<string, unknown>;
    const cname = text(cc.name, `colour ${i + 1} name`, 1, 30);
    const hex = typeof cc.hex === "string" ? cc.hex.trim() : "";
    if (!HEX_RE.test(hex)) throw new StoreError(`Colour ${i + 1} needs a colour value like #3E5E78.`);
    const id = (typeof cc.id === "string" && cc.id.trim() ? slugify(cc.id) : slugify(cname)) || `c${i + 1}`;
    if (seen.has(id)) throw new StoreError(`Two colours are both called "${cname}". Give each colour its own name.`);
    seen.add(id);
    return { id, name: cname, hex: hex.toUpperCase() };
  });

  return {
    slug,
    name,
    type,
    room: b.room as Room,
    art: b.art as ArtKind,
    price,
    wasPrice: wasRaw,
    badge,
    blurb: text(b.blurb, "short description", 10, 160),
    description: text(b.description, "description", 20, 2000),
    details,
    dimensions,
    material: text(b.material, "materials", 2, 200),
    wood: wood.toUpperCase(),
    colorways,
    pieces: int(b.pieces, "parts in the box", 1, 500),
    assemblyMinutes: int(b.assemblyMinutes, "assembly time", 0, 600),
    active: b.active !== false,
    sortOrder: b.sortOrder === undefined || b.sortOrder === "" ? 0 : int(b.sortOrder, "sort order", -1000, 100_000),
    stock: int(b.stock, "stock", 0, 100_000),
  };
}
