"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ART_KINDS, ProductArt } from "@/components/ProductArt";
import { useCart } from "@/components/CartProvider";
import { ROOMS } from "@/data/products";
import { formatINR } from "@/lib/pricing";
import type { ArtKind, Product } from "@/lib/types";

const ART_LABELS: Record<ArtKind, string> = {
  sofa: "Sofa",
  armchair: "Armchair",
  coffeetable: "Coffee table",
  floorlamp: "Floor lamp",
  bookcase: "Bookcase",
  rug: "Rug",
  bed: "Bed",
  nightstand: "Bedside table",
  dresser: "Chest of drawers",
  diningtable: "Dining table",
  chair: "Chair",
  pendant: "Pendant lamp",
  desk: "Desk",
  plant: "Plant pot",
  cushion: "Cushion",
  mugs: "Mugs",
  basket: "Basket",
};

type Colour = { key: number; id?: string; name: string; hex: string };

interface FormState {
  name: string;
  type: string;
  slug: string;
  room: string;
  art: ArtKind;
  wood: string;
  colours: Colour[];
  price: string;
  wasPrice: string;
  badge: string;
  stock: string;
  active: boolean;
  blurb: string;
  description: string;
  details: string;
  w: string;
  d: string;
  h: string;
  material: string;
  pieces: string;
  assemblyMinutes: string;
  sortOrder: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

let nextKey = 1;

function initialState(p?: Product & { active: boolean; sortOrder: number }): FormState {
  if (!p) {
    return {
      name: "",
      type: "",
      slug: "",
      room: "living",
      art: "sofa",
      wood: "#C9A27A",
      colours: [{ key: nextKey++, name: "Oat", hex: "#C9BBA2" }],
      price: "",
      wasPrice: "",
      badge: "New",
      stock: "10",
      active: true,
      blurb: "",
      description: "",
      details: "",
      w: "",
      d: "",
      h: "",
      material: "",
      pieces: "1",
      assemblyMinutes: "0",
      sortOrder: "100",
    };
  }
  return {
    name: p.name,
    type: p.type,
    slug: p.slug,
    room: p.room,
    art: p.art,
    wood: p.wood,
    colours: p.colorways.map((c) => ({ key: nextKey++, id: c.id, name: c.name, hex: c.hex })),
    price: String(p.price),
    wasPrice: p.wasPrice ? String(p.wasPrice) : "",
    badge: p.badge ?? "",
    stock: String(p.stock),
    active: p.active,
    blurb: p.blurb,
    description: p.description,
    details: p.details.join("\n"),
    w: String(p.dimensions.w),
    d: String(p.dimensions.d),
    h: String(p.dimensions.h),
    material: p.material,
    pieces: String(p.pieces),
    assemblyMinutes: String(p.assemblyMinutes),
    sortOrder: String(p.sortOrder),
  };
}

export function ProductForm({ product }: { product?: Product & { active: boolean; sortOrder: number } }) {
  const editing = !!product;
  const router = useRouter();
  const { notify } = useCart();
  const [f, setF] = useState<FormState>(() => initialState(product));
  const [slugTouched, setSlugTouched] = useState(editing);
  const [previewColour, setPreviewColour] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const autoSlug = useMemo(() => slugify(`${f.name} ${f.type}`), [f.name, f.type]);
  const slug = slugTouched ? f.slug : autoSlug;
  const shown = f.colours[Math.min(previewColour, f.colours.length - 1)] ?? { hex: "#C9BBA2", name: "" };
  const price = Number(f.price) || 0;
  const was = Number(f.wasPrice) || 0;

  function setColour(i: number, patch: Partial<Colour>) {
    setF((s) => ({ ...s, colours: s.colours.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = {
      name: f.name,
      type: f.type,
      slug,
      room: f.room,
      art: f.art,
      wood: f.wood,
      colorways: f.colours.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
      price: f.price,
      wasPrice: f.wasPrice,
      badge: f.badge,
      stock: f.stock,
      active: f.active,
      blurb: f.blurb,
      description: f.description,
      details: f.details,
      dimensions: { w: f.w, d: f.d, h: f.h },
      material: f.material,
      pieces: f.pieces,
      assemblyMinutes: f.assemblyMinutes,
      sortOrder: f.sortOrder,
    };
    const res = await fetch(editing ? `/api/admin/products/${product!.id}` : "/api/admin/products", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "The product couldn't be saved.");
      return;
    }
    notify(editing ? "Product saved" : "Product added");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form className="pform" onSubmit={save}>
      <div className="pform-main">
        <fieldset>
          <legend>Basics</legend>
          <div className="field-row">
            <label className="field">
              <span>Name</span>
              <input value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={40} placeholder="Fold" />
            </label>
            <label className="field">
              <span>Product type</span>
              <input value={f.type} onChange={(e) => set("type", e.target.value)} required maxLength={60} placeholder="Three-seat sofa" />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Room</span>
              <select value={f.room} onChange={(e) => set("room", e.target.value)}>
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Web address</span>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                placeholder="fold-three-seat-sofa"
              />
              <small>
                rumm.in/product/{slug || "…"}
                {editing && " · changing this breaks links people already have"}
              </small>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Illustration</legend>
          <div className="art-picker" role="radiogroup" aria-label="Illustration">
            {ART_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={f.art === k}
                onClick={() => set("art", k)}
                className="art-option"
              >
                <ProductArt kind={k} color={shown.hex} wood={f.wood} />
                <span>{ART_LABELS[k]}</span>
              </button>
            ))}
          </div>
          <label className="field field-inline">
            <span>Timber colour (legs, frames)</span>
            <span className="colour-input">
              <input type="color" value={f.wood} onChange={(e) => set("wood", e.target.value.toUpperCase())} aria-label="Timber colour" />
              <code>{f.wood}</code>
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Colours</legend>
          <ul className="colour-rows">
            {f.colours.map((c, i) => (
              <li key={c.key}>
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => {
                    setColour(i, { hex: e.target.value.toUpperCase() });
                    setPreviewColour(i);
                  }}
                  aria-label={`Colour ${i + 1}`}
                />
                <input
                  value={c.name}
                  onChange={(e) => setColour(i, { name: e.target.value })}
                  onFocus={() => setPreviewColour(i)}
                  placeholder="Colour name, e.g. Fjord blue"
                  aria-label={`Colour ${i + 1} name`}
                  maxLength={30}
                  required
                />
                <code>{c.hex}</code>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setF((s) => ({ ...s, colours: s.colours.filter((_, j) => j !== i) }))}
                  disabled={f.colours.length === 1}
                  aria-label={`Remove ${c.name || `colour ${i + 1}`}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {f.colours.length < 8 && (
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => {
                setF((s) => ({ ...s, colours: [...s.colours, { key: nextKey++, name: "", hex: "#8FA08A" }] }));
                setPreviewColour(f.colours.length);
              }}
            >
              Add colour
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend>Price and stock</legend>
          <div className="field-row field-row-3">
            <label className="field">
              <span>Price (₹)</span>
              <input inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} required />
            </label>
            <label className="field">
              <span>Was price (₹, optional)</span>
              <input inputMode="numeric" value={f.wasPrice} onChange={(e) => set("wasPrice", e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="field">
              <span>In stock</span>
              <input inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} required />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Badge</span>
              <select value={f.badge} onChange={(e) => set("badge", e.target.value)}>
                <option value="">None</option>
                <option>New</option>
                <option>Lower price</option>
                <option>Last few</option>
              </select>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
              <span>
                <strong>Show in the shop</strong>
                <small>Hidden products can't be bought, but past orders keep them.</small>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Description</legend>
          <label className="field">
            <span>Short description (shown on cards)</span>
            <input value={f.blurb} onChange={(e) => set("blurb", e.target.value)} maxLength={160} required />
          </label>
          <label className="field">
            <span>Full description</span>
            <textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} required />
          </label>
          <label className="field">
            <span>Details, one per line</span>
            <textarea rows={4} value={f.details} onChange={(e) => set("details", e.target.value)} placeholder={"Covers zip off\nSolid oak legs"} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Size and build</legend>
          <div className="field-row field-row-3">
            <label className="field">
              <span>Width (cm)</span>
              <input inputMode="numeric" value={f.w} onChange={(e) => set("w", e.target.value.replace(/\D/g, ""))} required />
            </label>
            <label className="field">
              <span>Depth (cm)</span>
              <input inputMode="numeric" value={f.d} onChange={(e) => set("d", e.target.value.replace(/\D/g, ""))} required />
            </label>
            <label className="field">
              <span>Height (cm)</span>
              <input inputMode="numeric" value={f.h} onChange={(e) => set("h", e.target.value.replace(/\D/g, ""))} required />
            </label>
          </div>
          <label className="field">
            <span>Materials</span>
            <input value={f.material} onChange={(e) => set("material", e.target.value)} placeholder="Solid oak, cotton-linen weave" required />
          </label>
          <div className="field-row field-row-3">
            <label className="field">
              <span>Parts in the box</span>
              <input inputMode="numeric" value={f.pieces} onChange={(e) => set("pieces", e.target.value.replace(/\D/g, ""))} required />
            </label>
            <label className="field">
              <span>Assembly (minutes)</span>
              <input inputMode="numeric" value={f.assemblyMinutes} onChange={(e) => set("assemblyMinutes", e.target.value.replace(/\D/g, ""))} required />
            </label>
            <label className="field">
              <span>Sort order (lower shows first)</span>
              <input inputMode="numeric" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/[^\d-]/g, ""))} />
            </label>
          </div>
        </fieldset>
      </div>

      <aside className="pform-side">
        <p className="pform-side-title">Preview</p>
        <div className="card pform-preview">
          <div className="card-art">
            <ProductArt kind={f.art} color={shown.hex} wood={f.wood} />
            {f.badge && <span className={`badge badge-${f.badge === "Lower price" ? "sale" : "plain"}`}>{f.badge}</span>}
          </div>
          <div className="card-body">
            <div className="card-title">
              <h3>{f.name || "Product name"}</h3>
              <p>{f.type || "Product type"}</p>
            </div>
            <p className="card-price">
              <span className={`price ${was > price ? "price-sale" : ""}`}>{formatINR(price)}</span>
              {was > price && <s>{formatINR(was)}</s>}
            </p>
            <div className="swatches swatches-sm" role="radiogroup" aria-label="Preview colour">
              {f.colours.map((c, i) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={c === shown}
                  aria-label={c.name || `Colour ${i + 1}`}
                  style={{ ["--sw" as string]: c.hex }}
                  onClick={() => setPreviewColour(i)}
                />
              ))}
            </div>
          </div>
        </div>
        {!f.active && <p className="pform-hidden-note">Hidden from the shop</p>}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
        </button>
        <Link href="/admin/products" className="btn btn-quiet btn-block">
          Cancel
        </Link>
        {editing && f.active && (
          <Link href={`/product/${product!.slug}`} className="text-link pform-view" target="_blank">
            View in the shop
          </Link>
        )}
      </aside>
    </form>
  );
}
