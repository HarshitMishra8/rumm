"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

const WORDS = ["", "Poor", "Not great", "Fine", "Good", "Love it"];

export function ReviewForm({
  productId,
  existing,
}: {
  productId: string;
  existing: { rating: number; title: string; body: string } | null;
}) {
  const router = useRouter();
  const { notify } = useCart();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const shown = hover || rating;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title, body }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Your review couldn't be saved.");
      return;
    }
    notify(existing ? "Review updated" : "Thanks for your review");
    router.refresh();
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <h3>{existing ? "Edit your review" : "Write a review"}</h3>
      <fieldset className="star-input">
        <legend>Your rating</legend>
        <div onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} onMouseEnter={() => setHover(n)} data-on={n <= shown || undefined}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                <path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.3 1.4 6.3L12 16.8 6.3 20l1.4-6.3L2.9 9.4l6.4-.7z" />
              </svg>
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}
              </span>
            </label>
          ))}
        </div>
        <span className="star-word" aria-hidden="true">
          {WORDS[shown]}
        </span>
      </fieldset>
      <label className="field">
        <span>Headline (optional)</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Comfortable for long evenings" />
      </label>
      <label className="field">
        <span>Your review</span>
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1500}
          required
          placeholder="How does it look and feel in your home? Was assembly easy?"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : existing ? "Update review" : "Post review"}
      </button>
    </form>
  );
}
