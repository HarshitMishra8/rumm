"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ProductArt } from "@/components/ProductArt";
import { assemblyFee, deliveryDate, deliveryFee, formatDay, formatINR } from "@/lib/pricing";
import type { DeliveryOption, PaymentOption } from "@/lib/types";

export function CheckoutForm({ email }: { email: string | null }) {
  const { cart, ready, refresh } = useCart();
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryOption>("standard");
  const [payment, setPayment] = useState<PaymentOption>("cod");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  if (!ready) return <div className="checkout-loading" aria-busy="true" />;

  if (cart.lines.length === 0) {
    return (
      <div className="empty">
        <p>Your bag is empty, so there&apos;s nothing to check out yet.</p>
        <Link href="/shop" className="btn btn-primary">
          Browse the shop
        </Link>
      </div>
    );
  }

  const del = deliveryFee(cart.subtotal);
  const asm = delivery === "assembly" ? assemblyFee(cart.subtotal) : 0;
  const total = cart.subtotal + del + asm;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPlacing(true);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email ?? get("email"),
        address: {
          fullName: get("fullName"),
          phone: get("phone"),
          line1: get("line1"),
          line2: get("line2"),
          city: get("city"),
          pin: get("pin"),
        },
        deliveryOption: delivery,
        payment,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "The order couldn't be placed.");
      setPlacing(false);
      return;
    }
    await refresh();
    router.push(`/orders/${data.order.id}`);
  }

  return (
    <form className="checkout" onSubmit={submit} noValidate={false}>
      <div className="checkout-main">
        <fieldset>
          <legend>Where should we deliver?</legend>
          {!email && (
            <label className="field">
              <span>Email for the order confirmation</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
          )}
          <label className="field">
            <span>Full name</span>
            <input name="fullName" autoComplete="name" required minLength={2} />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <input name="phone" type="tel" autoComplete="tel" inputMode="numeric" required placeholder="98765 43210" />
          </label>
          <label className="field">
            <span>House number and street</span>
            <input name="line1" autoComplete="address-line1" required />
          </label>
          <label className="field">
            <span>Area or landmark (optional)</span>
            <input name="line2" autoComplete="address-line2" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>City</span>
              <input name="city" autoComplete="address-level2" required />
            </label>
            <label className="field">
              <span>PIN code</span>
              <input name="pin" autoComplete="postal-code" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required />
            </label>
          </div>
        </fieldset>

        <fieldset className="choices">
          <legend>Delivery</legend>
          <label className="choice">
            <input type="radio" name="delivery" checked={delivery === "standard"} onChange={() => setDelivery("standard")} />
            <span>
              <strong>Flat-packed to your door</strong>
              <small>Arrives by {formatDay(deliveryDate(new Date(), 3))}</small>
            </span>
            <em>{del === 0 ? "Free" : formatINR(del)}</em>
          </label>
          <label className="choice">
            <input type="radio" name="delivery" checked={delivery === "assembly"} onChange={() => setDelivery("assembly")} />
            <span>
              <strong>Delivered and assembled</strong>
              <small>A fitter builds everything on {formatDay(deliveryDate(new Date(), 4))}</small>
            </span>
            <em>+{formatINR(assemblyFee(cart.subtotal))}</em>
          </label>
        </fieldset>

        <fieldset className="choices">
          <legend>Payment</legend>
          <label className="choice">
            <input type="radio" name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} />
            <span>
              <strong>Cash on delivery</strong>
              <small>Pay the driver when the boxes arrive</small>
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="payment" checked={payment === "upi-on-delivery"} onChange={() => setPayment("upi-on-delivery")} />
            <span>
              <strong>UPI on delivery</strong>
              <small>Scan the driver&apos;s QR code with any UPI app</small>
            </span>
          </label>
        </fieldset>
      </div>

      <aside className="summary" aria-labelledby="summary-title">
        <h2 id="summary-title">Order summary</h2>
        <ul>
          {cart.lines.map((l) => (
            <li key={`${l.productId}-${l.colorwayId}`}>
              <span className="summary-thumb">
                <ProductArt kind={l.product.art} color={l.colorway.hex} wood={l.product.wood} />
                <b>{l.qty}</b>
              </span>
              <span>
                {l.product.name} {l.product.type.toLowerCase()}
                <small>{l.colorway.name}</small>
              </span>
              <span>{formatINR(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatINR(cart.subtotal)}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>{del === 0 ? "Free" : formatINR(del)}</dd>
          </div>
          {asm > 0 && (
            <div>
              <dt>Assembly</dt>
              <dd>{formatINR(asm)}</dd>
            </div>
          )}
          <div className="summary-total">
            <dt>Total</dt>
            <dd className="price">{formatINR(total)}</dd>
          </div>
        </dl>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={placing}>
          {placing ? "Placing order…" : `Place order, pay ${formatINR(total)} on delivery`}
        </button>
      </aside>
    </form>
  );
}
