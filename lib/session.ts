import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_MAX_AGE, StoreError, newCartId, userForSession } from "@/lib/store";

export const CART_COOKIE = "rumm_cart";
export const SESSION_COOKIE = "rumm_session";
export const RECENT_ORDERS_COOKIE = "rumm_recent_orders";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function currentUser() {
  const jar = await cookies();
  return userForSession(jar.get(SESSION_COOKIE)?.value);
}

export async function cartId(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value;
}

/** Returns the cart id, creating and setting the cookie if needed. */
export async function ensureCartId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const id = newCartId();
  jar.set(CART_COOKIE, id, { ...base, maxAge: 60 * 60 * 24 * 90 });
  return id;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, { ...base, maxAge: SESSION_MAX_AGE });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function recentOrderIds(): Promise<string[]> {
  const raw = (await cookies()).get(RECENT_ORDERS_COOKIE)?.value ?? "";
  return raw.split(",").filter(Boolean);
}

export async function rememberOrder(id: string) {
  const ids = [id, ...(await recentOrderIds())].slice(0, 10);
  (await cookies()).set(RECENT_ORDERS_COOKIE, ids.join(","), { ...base, maxAge: 60 * 60 * 24 * 60 });
}

/** Turn thrown errors into JSON responses with a useful message. */
export function errorResponse(err: unknown) {
  if (err instanceof StoreError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong on our side. Try again in a moment." }, { status: 500 });
}

export async function readJson<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    throw new StoreError("The request body must be JSON.");
  }
}
