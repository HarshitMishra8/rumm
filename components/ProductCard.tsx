"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ProductArt } from "@/components/ProductArt";
import { HeartButton } from "@/components/HeartButton";
import { Stars } from "@/components/Stars";
import { useCart } from "@/components/CartProvider";
import { formatINR } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export function ProductCard({ product, size = "md" }: { product: Product; size?: "md" | "sm" }) {
  const { add } = useCart();
  const [cw, setCw] = useState(product.colorways[0]);
  const [adding, setAdding] = useState(false);
  const artRef = useRef<HTMLAnchorElement>(null);
  const href = `/product/${product.slug}?c=${cw.id}`;

  return (
    <article className={`card card-${size}`}>
      <div className="card-media">
        <Link href={href} className="card-art" ref={artRef} aria-label={`${product.name} ${product.type}`}>
          <ProductArt kind={product.art} color={cw.hex} wood={product.wood} />
          {product.badge && <span className={`badge badge-${product.badge === "Lower price" ? "sale" : "plain"}`}>{product.badge}</span>}
        </Link>
        <HeartButton productId={product.id} name={product.name} />
      </div>
      <div className="card-body">
        <div className="card-title">
          <h3>
            <Link href={href}>{product.name}</Link>
          </h3>
          <p>{product.type}</p>
        </div>
        {product.rating && (
          <p className="card-rating">
            <Stars value={product.rating.avg} size={12} />
            <span>
              {product.rating.avg.toFixed(1)} ({product.rating.count})
            </span>
          </p>
        )}
        <p className="card-price">
          <span className={`price ${product.wasPrice ? "price-sale" : ""}`}>{formatINR(product.price)}</span>
          {product.wasPrice && <s>{formatINR(product.wasPrice)}</s>}
        </p>
        <div className="card-foot">
          <div className="swatches swatches-sm" role="radiogroup" aria-label={`${product.name} colour`}>
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
          <button
            type="button"
            className="quick-add"
            disabled={adding}
            aria-label={`Add ${product.name} in ${cw.name} to bag`}
            onClick={async () => {
              setAdding(true);
              await add({ productId: product.id, colorwayId: cw.id }, artRef.current?.querySelector("svg"));
              setAdding(false);
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
