"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";

const LABELS = { placed: "Placed", packed: "Packed", shipped: "On the way", delivered: "Delivered" } as const;
type Status = keyof typeof LABELS;

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: Status }) {
  const { notify } = useCart();
  const [value, setValue] = useState<Status>(status);
  const [saving, setSaving] = useState(false);

  async function change(next: Status) {
    const previous = value;
    setValue(next); // show the change straight away
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setValue(previous);
      notify((await res.json()).error ?? "The status couldn't be changed.");
      return;
    }
    notify(`${orderId} marked ${LABELS[next].toLowerCase()}`);
  }

  return (
    <select
      className="status-select"
      data-status={value}
      value={value}
      disabled={saving}
      onChange={(e) => change(e.target.value as Status)}
      aria-label={`Status of ${orderId}`}
    >
      {(Object.keys(LABELS) as Status[]).map((s) => (
        <option key={s} value={s}>
          {LABELS[s]}
        </option>
      ))}
    </select>
  );
}
