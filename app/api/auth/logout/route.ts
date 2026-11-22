import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/store";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/session";

export async function POST() {
  await deleteSession((await cookies()).get(SESSION_COOKIE)?.value);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
