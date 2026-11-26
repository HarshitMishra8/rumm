import { NextResponse } from "next/server";
import { runAssistant, type ChatMessage } from "@/lib/assistant";
import { geminiEnabled } from "@/lib/gemini";
import { StoreError } from "@/lib/errors";
import { cartId, currentUser, ensureCartId, errorResponse, readJson, recentOrderIds } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;
const LIMIT_PER_MINUTE = 15;

/** Simple per-visitor limit, per server process, to keep API costs in check. */
const hits = new Map<string, number[]>();
function allow(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= LIMIT_PER_MINUTE) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // don't grow forever
  return true;
}

function clean(body: unknown): ChatMessage[] {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) throw new StoreError("Type a message first.");
  const messages = raw.slice(-MAX_MESSAGES).map((m) => {
    const role = (m as ChatMessage)?.role === "assistant" ? "assistant" : "user";
    const text = String((m as ChatMessage)?.text ?? "").trim().slice(0, MAX_CHARS);
    return { role, text } as ChatMessage;
  });
  // Gemini expects the conversation to start with the customer
  while (messages.length && messages[0].role !== "user") messages.shift();
  const last = messages.at(-1);
  if (!last || last.role !== "user" || !last.text) throw new StoreError("Type a message first.");
  return messages.filter((m) => m.text);
}

/** POST /api/chat { messages: [{ role: "user" | "assistant", text }] } → { reply, products, cartChanged } */
export async function POST(req: Request) {
  try {
    if (!geminiEnabled()) throw new StoreError("The assistant isn't set up yet.", 503);
    const user = await currentUser();
    const visitor = user?.id ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!allow(visitor)) throw new StoreError("You're sending messages quickly. Wait a minute and try again.", 429);

    const messages = clean(await readJson(req));
    const result = await runAssistant(messages, {
      user,
      cartId: await cartId(),
      ensureCartId,
      recentOrderIds: await recentOrderIds(),
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
