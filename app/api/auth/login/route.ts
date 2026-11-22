import { NextResponse } from "next/server";
import { createSession, verifyUser } from "@/lib/store";
import { errorResponse, readJson, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email: string; password: string }>(req);
    const user = await verifyUser(String(body.email ?? ""), String(body.password ?? ""));
    const session = await createSession(user.id);
    await setSessionCookie(session.token);
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
