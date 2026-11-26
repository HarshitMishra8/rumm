import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/CheckoutForm";
import { currentUser } from "@/lib/session";
import { razorpayEnabled } from "@/lib/razorpay";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await currentUser();
  return (
    <div className="checkout-page">
      <h1 className="page-title">Checkout</h1>
      {!user && (
        <p className="checkout-note">
          Checking out as a guest. <Link href="/account?next=/checkout">Sign in</Link> to keep your orders in one place.
        </p>
      )}
      <CheckoutForm email={user?.email ?? null} onlineEnabled={razorpayEnabled()} />
    </div>
  );
}
