import { NextResponse } from "next/server";
import { createSession, registerUser } from "@/lib/store";
import { errorResponse, readJson, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email: string; name: string; password: string }>(req);
    const user = await registerUser({ email: String(body.email ?? ""), name: String(body.name ?? ""), password: String(body.password ?? "") });
    const session = await createSession(user.id);
    await setSessionCookie(session.token);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
