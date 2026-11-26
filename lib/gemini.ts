/**
 * Minimal Gemini API client (REST, no SDK).
 * Docs: https://ai.google.dev/gemini-api/docs/function-calling
 */
export function geminiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Tried in order when a model is busy or unavailable. */
const DEFAULT_MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash-lite"];

/**
 * Models to try, best first. GEMINI_MODEL can name one model or a
 * comma-separated list; the defaults are added after it as fallbacks.
 */
export function geminiModels(): string[] {
  const mine = (process.env.GEMINI_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([...mine, ...DEFAULT_MODELS])];
}

export interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  [key: string]: unknown; // e.g. thoughtSignature, which must be sent back untouched
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export class GeminiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

/** Busy, rate-limited, briefly broken, or a model name Google has retired: worth trying another model. */
const TRY_ANOTHER = new Set([404, 429, 500, 503]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One Gemini call may take this long before we give up (override with GEMINI_TIMEOUT_MS). */
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30_000;

async function callModel(
  model: string,
  input: { system: string; contents: GeminiContent[]; functions: FunctionDeclaration[] },
): Promise<GeminiContent | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: input.contents,
        tools: [{ functionDeclarations: input.functions }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new GeminiError(`Gemini didn't answer within ${TIMEOUT_MS / 1000}s`);
    }
    throw new GeminiError(`Couldn't reach Gemini: ${(err as Error)?.message ?? err}`);
  }
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: GeminiContent; finishReason?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new GeminiError(`Gemini ${res.status} (${model}): ${data.error?.message ?? "request failed"}`, res.status);
  // no candidate usually means the prompt was blocked by safety filters
  return data.candidates?.[0]?.content ?? null;
}

/**
 * Calls Gemini, starting with `preferred` (the model that answered earlier in
 * this reply) and falling back through the list when a model is busy.
 * Returns the reply and the model that produced it.
 */
export async function generate(
  input: { system: string; contents: GeminiContent[]; functions: FunctionDeclaration[] },
  preferred?: string,
): Promise<{ content: GeminiContent | null; model: string }> {
  const queue = preferred ? [preferred, ...geminiModels().filter((m) => m !== preferred)] : geminiModels();
  const tried = new Set<string>();
  let last: unknown;
  while (queue.length) {
    const model = queue.shift()!;
    if (tried.has(model)) continue;
    tried.add(model);
    // a busy model often frees up within a second, so give it one more go
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return { content: await callModel(model, input), model };
      } catch (err) {
        last = err;
        const status = err instanceof GeminiError ? err.status : 0;
        if (!TRY_ANOTHER.has(status)) throw err; // bad key, bad request, timeout, offline: another model won't help
        console.warn(`[chat] ${(err as Error).message}`);
        if (status === 404) {
          // Google names the replacement when it retires a model ("...use models/gemini-x-flash..."): try that next
          const suggested = (err as Error).message.match(/models\/(gemini-[\w.-]+)/g)?.map((m) => m.replace("models/", ""));
          for (const m of suggested ?? []) if (!tried.has(m)) queue.unshift(m);
        }
        if (status === 503 && attempt === 0) {
          await sleep(800);
          continue;
        }
        break; // next model
      }
    }
  }
  throw last;
}
