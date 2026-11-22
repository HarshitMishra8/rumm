"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductArt } from "@/components/ProductArt";
import { useCart } from "@/components/CartProvider";
import { formatINR } from "@/lib/pricing";
import type { Product } from "@/lib/types";

/** Where each piece sits in the 1200 × 700 room, and where its hotspot goes. */
const LAYOUT: Record<string, { x: number; y: number; s: number; hot: [number, number]; rotate?: number }> = {
  "p-field": { x: 240, y: 244, s: 1.6, hot: [790, 652] },
  "p-ledge": { x: -147, y: 71, s: 1.7, hot: [205, 210] },
  "p-fold": { x: 340, y: 155, s: 1.5, hot: [735, 335] },
  "p-plank": { x: 400, y: 353, s: 1.1, hot: [610, 560] },
  "p-stem": { x: 660, y: 98, s: 1.7, hot: [1000, 160] },
  "p-perch": { x: 810, y: 316, s: 1.2, hot: [1060, 430] },
  "p-sprout": { x: 120, y: 309, s: 0.9, hot: [300, 400] },
  "p-puff": { x: 452, y: 336, s: 0.32, hot: [515, 372], rotate: -8 },
};

const SCHEMES = [
  {
    id: "fjord",
    name: "Fjord",
    wall: "#D9E2E4",
    floor: "#C8B79A",
    picks: { "p-fold": "fjord", "p-perch": "oat", "p-plank": "oak", "p-stem": "ink", "p-ledge": "white", "p-field": "indigo", "p-sprout": "white", "p-puff": "mustard" },
  },
  {
    id: "moss",
    name: "Moss",
    wall: "#DADFCF",
    floor: "#BFA27C",
    picks: { "p-fold": "moss", "p-perch": "oat", "p-plank": "oak", "p-stem": "brass", "p-ledge": "birch", "p-field": "sand", "p-sprout": "terracotta", "p-puff": "rust" },
  },
  {
    id: "clay",
    name: "Clay",
    wall: "#E6D6CC",
    floor: "#8F6C52",
    picks: { "p-fold": "rust", "p-perch": "moss", "p-plank": "black", "p-stem": "white", "p-ledge": "walnut", "p-field": "sand", "p-sprout": "sage", "p-puff": "indigo" },
  },
] as const;

type SchemeId = (typeof SCHEMES)[number]["id"];

export function RoomScene({ products }: { products: Product[] }) {
  const { add } = useCart();
  const [schemeId, setSchemeId] = useState<SchemeId>("fjord");
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const scheme = SCHEMES.find((s) => s.id === schemeId)!;

  const colorFor = (p: Product) => {
    const pick = (scheme.picks as Record<string, string>)[p.id];
    return p.colorways.find((c) => c.id === pick) ?? p.colorways[0];
  };

  const total = useMemo(() => products.reduce((n, p) => n + p.price, 0), [products]);

  // close popover on outside click / Escape
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest(".hotspot") && !t.closest(".spot-card")) setActive(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const activeProduct = products.find((p) => p.id === active);

  async function addRoom() {
    setBusy(true);
    await add(
      products.map((p) => ({ productId: p.id, colorwayId: colorFor(p).id })),
      sceneRef.current?.querySelector("svg.room"),
    );
    setBusy(false);
  }

  return (
    <section className="showroom" aria-labelledby="showroom-title">
      <div className="showroom-intro">
        <h1 id="showroom-title" className="display">
          Good furniture for the rooms you actually live in.
        </h1>
        <p className="lede">
          Everything in this living room ships flat to your door in three days. Tap any piece to see what it costs, or change the
          colours to suit your walls.
        </p>
      </div>

      <div className="scene" ref={sceneRef}>
        <svg className="room" viewBox="0 50 1200 650" role="img" aria-label={`A furnished living room in the ${scheme.name} colours`}>
          <rect y="50" width="1200" height="490" style={{ fill: scheme.wall }} className="wall" />
          <rect y="520" width="1200" height="180" style={{ fill: scheme.floor }} className="floor" />
          <rect y="516" width="1200" height="10" fill="rgba(255,255,255,.55)" />
          {/* window */}
          <g className="window">
            <rect x="560" y="70" width="290" height="300" rx="6" fill="#F7F8F6" />
            <rect x="574" y="84" width="262" height="272" fill="#BFD3DA" />
            <path d="M574 300 Q640 250 700 280 T836 250 L836 356 L574 356 Z" fill="#9DB8AE" />
            <rect x="701" y="84" width="8" height="272" fill="#F7F8F6" />
            <rect x="574" y="216" width="262" height="8" fill="#F7F8F6" />
            <rect x="548" y="366" width="314" height="12" rx="4" fill="#F7F8F6" />
          </g>
          {/* framed print */}
          <g className="print">
            <rect x="1092" y="150" width="88" height="112" fill="#F7F8F6" />
            <rect x="1101" y="159" width="70" height="94" fill="#E8E4DC" />
            <circle cx="1136" cy="196" r="18" fill="#C9962E" />
            <path d="M1101 253 L1128 218 L1150 236 L1171 220 L1171 253 Z" fill="#3E5E78" />
          </g>

          {products.map((p, i) => {
            const L = LAYOUT[p.id];
            if (!L) return null;
            return (
              <g
                key={p.id}
                className="piece"
                style={{ ["--i" as string]: i }}
                data-active={active === p.id || undefined}
              >
                <g transform={L.rotate ? `rotate(${L.rotate} ${L.x + 200 * L.s} ${L.y + 150 * L.s})` : undefined}>
                  <ProductArt
                    kind={p.art}
                    color={colorFor(p).hex}
                    wood={p.wood}
                    bare
                    x={L.x}
                    y={L.y}
                    width={400 * L.s}
                    height={300 * L.s}
                  />
                </g>
              </g>
            );
          })}
        </svg>

        {products.map((p, i) => {
          const L = LAYOUT[p.id];
          if (!L) return null;
          return (
            <button
              key={p.id}
              type="button"
              className="hotspot"
              style={{
                left: `${(L.hot[0] / 1200) * 100}%`,
                top: `${((L.hot[1] - 50) / 650) * 100}%`,
                ["--i" as string]: i,
              }}
              aria-expanded={active === p.id}
              aria-label={`${p.name} ${p.type.toLowerCase()}, ${formatINR(p.price)}`}
              onClick={() => setActive((a) => (a === p.id ? null : p.id))}
            >
              <span aria-hidden="true" />
            </button>
          );
        })}

        {activeProduct && (
          <SpotCard
            key={activeProduct.id}
            product={activeProduct}
            colorwayId={colorFor(activeProduct).id}
            hot={LAYOUT[activeProduct.id].hot}
            onAdd={async (el) => {
              await add({ productId: activeProduct.id, colorwayId: colorFor(activeProduct).id }, el);
              setActive(null);
            }}
          />
        )}
      </div>

      <div className="scene-bar">
        <fieldset className="schemes">
          <legend>Room colours</legend>
          {SCHEMES.map((s) => (
            <label key={s.id} className="scheme">
              <input type="radio" name="scheme" value={s.id} checked={s.id === schemeId} onChange={() => setSchemeId(s.id)} />
              <span className="scheme-chip" aria-hidden="true">
                <i style={{ background: s.wall }} />
                <i
                  style={{
                    background: products.find((p) => p.id === "p-fold")?.colorways.find((c) => c.id === s.picks["p-fold"])?.hex,
                  }}
                />
              </span>
              {s.name}
            </label>
          ))}
        </fieldset>

        <div className="room-total">
          <p>
            <span>All {products.length} pieces</span>
            <strong className="price">{formatINR(total)}</strong>
          </p>
          <button type="button" className="btn btn-primary" onClick={addRoom} disabled={busy}>
            {busy ? "Adding…" : "Add the whole room"}
          </button>
        </div>
      </div>
    </section>
  );
}

function SpotCard({
  product,
  colorwayId,
  hot,
  onAdd,
}: {
  product: Product;
  colorwayId: string;
  hot: [number, number];
  onAdd: (el: Element | null) => Promise<void>;
}) {
  const art = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const cw = product.colorways.find((c) => c.id === colorwayId) ?? product.colorways[0];
  const flipX = hot[0] > 700;
  const flipY = hot[1] > 430;
  return (
    <div
      className="spot-card"
      role="dialog"
      aria-label={`${product.name} ${product.type}`}
      data-flip-x={flipX || undefined}
      data-flip-y={flipY || undefined}
      style={{ left: `${(hot[0] / 1200) * 100}%`, top: `${((hot[1] - 50) / 650) * 100}%` }}
    >
      <div className="spot-art" ref={art}>
        <ProductArt kind={product.art} color={cw.hex} wood={product.wood} />
      </div>
      <div className="spot-body">
        <p className="spot-name">
          <strong>{product.name}</strong>
          <span>{product.type}</span>
        </p>
        <p className="price price-md">{formatINR(product.price)}</p>
        <p className="spot-cw">{cw.name}</p>
        <div className="spot-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={adding}
            onClick={async () => {
              setAdding(true);
              await onAdd(art.current?.querySelector("svg") ?? null);
            }}
          >
            {adding ? "Adding…" : "Add to bag"}
          </button>
          <Link href={`/product/${product.slug}`} className="text-link">
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
