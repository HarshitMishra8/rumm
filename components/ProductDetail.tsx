"use client";

import { useRef, useState } from "react";
import { ProductArt } from "@/components/ProductArt";
import { useCart } from "@/components/CartProvider";
import { deliveryDate, formatDay, formatINR } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export function ProductDetail({ product, initialColorway, stock }: { product: Product; initialColorway?: string; stock: number }) {
  const { add } = useCart();
  const [cw, setCw] = useState(product.colorways.find((c) => c.id === initialColorway) ?? product.colorways[0]);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const soldOut = stock <= 0;
  const { w, d, h } = product.dimensions;

  return (
    <div className="pdp">
      <div className="pdp-stage" ref={stage} style={{ ["--tint" as string]: cw.hex }}>
        <ProductArt kind={product.art} color={cw.hex} wood={product.wood} title={`${product.name} ${product.type} in ${cw.name}`} />
        <DimensionRuler w={w} />
      </div>

      <div className="pdp-info">
        <p className="pdp-type">{product.type}</p>
        <h1 className="pdp-name">{product.name}</h1>
        <p className="pdp-blurb">{product.blurb}</p>

        <p className="pdp-price">
          <span className={`price price-xl ${product.wasPrice ? "price-sale" : ""}`}>{formatINR(product.price)}</span>
          {product.wasPrice && (
            <span className="was">
              was <s>{formatINR(product.wasPrice)}</s>
            </span>
          )}
        </p>

        <fieldset className="pdp-colours">
          <legend>
            Colour: <strong>{cw.name}</strong>
          </legend>
          <div className="swatches" role="radiogroup" aria-label="Colour">
            {product.colorways.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === cw.id}
                aria-label={c.name}
                title={c.name}
                style={{ ["--sw" as string]: c.hex }}
                onClick={() => setCw(c)}
              />
            ))}
          </div>
        </fieldset>

        <div className="pdp-buy">
          <div className="stepper stepper-lg" aria-label="Quantity">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer" disabled={qty <= 1}>
              −
            </button>
            <output aria-live="polite">{qty}</output>
            <button type="button" onClick={() => setQty((q) => Math.min(Math.min(20, stock), q + 1))} aria-label="One more" disabled={qty >= Math.min(20, stock)}>
              +
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={adding || soldOut}
            onClick={async () => {
              setAdding(true);
              await add({ productId: product.id, colorwayId: cw.id, qty }, stage.current?.querySelector("svg"));
              setAdding(false);
              setQty(1);
            }}
          >
            {soldOut ? "Out of stock" : adding ? "Adding…" : "Add to bag"}
          </button>
        </div>

        <dl className="pdp-facts">
          <div>
            <dt>Delivery</dt>
            <dd>Arrives by {formatDay(deliveryDate())}</dd>
          </div>
          <div>
            <dt>In the box</dt>
            <dd>{product.pieces === 1 ? "Ready to use" : `${product.pieces} parts, flat-packed`}</dd>
          </div>
          <div>
            <dt>Assembly</dt>
            <dd>{product.assemblyMinutes === 0 ? "None needed" : `About ${product.assemblyMinutes} minutes, or we do it for you`}</dd>
          </div>
          <div>
            <dt>Stock</dt>
            <dd className={stock < 10 ? "low" : undefined}>{soldOut ? "Sold out" : stock < 10 ? `Only ${stock} left` : "In stock"}</dd>
          </div>
        </dl>

        <details className="pdp-more" open>
          <summary>About this piece</summary>
          <p>{product.description}</p>
          <ul>
            {product.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </details>
        <details className="pdp-more">
          <summary>Size and materials</summary>
          <p>
            {w} cm wide, {d} cm deep, {h} cm high.
          </p>
          <p>{product.material}.</p>
        </details>
      </div>
    </div>
  );
}

function DimensionRuler({ w }: { w: number }) {
  return (
    <div className="ruler" aria-hidden="true">
      <span className="ruler-w">{w} cm wide</span>
    </div>
  );
}
