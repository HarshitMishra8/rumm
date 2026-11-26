"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";

export function ReviewVisibility({ id, hidden }: { id: string; hidden: boolean }) {
  const { notify } = useCart();
  const [isHidden, setHidden] = useState(hidden);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !isHidden }),
    });
    setSaving(false);
    if (!res.ok) {
      notify((await res.json().catch(() => ({}))).error ?? "That couldn't be changed.");
      return;
    }
    setHidden(!isHidden);
    notify(isHidden ? "Review shown again" : "Review hidden");
  }

  return (
    <button type="button" className="btn btn-quiet btn-sm" onClick={toggle} disabled={saving} data-hidden={isHidden || undefined}>
      {isHidden ? "Show" : "Hide"}
    </button>
  );
}
