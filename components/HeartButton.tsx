"use client";

import { useWishlist } from "@/components/WishlistProvider";

export function HeartButton({ productId, name, size = "md" }: { productId: string; name: string; size?: "md" | "lg" }) {
  const { ids, toggle } = useWishlist();
  const saved = ids.has(productId);
  return (
    <button
      type="button"
      className={`heart-btn heart-${size}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={(e) => {
        e.preventDefault();
        toggle(productId, name);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 20s-7.2-4.4-9.3-8.6C1.2 8.4 3 5 6.4 5c2.1 0 3.5 1.2 4.3 2.5h2.6C14.1 6.2 15.5 5 17.6 5 21 5 22.8 8.4 21.3 11.4 19.2 15.6 12 20 12 20z"
          transform="translate(0 -0.5)"
        />
      </svg>
    </button>
  );
}
