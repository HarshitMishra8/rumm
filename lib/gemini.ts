/**
 * Minimal Gemini API client (REST, no SDK).
 * Docs: https://ai.google.dev/gemini-api/docs/function-calling
 */
export function geminiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Override with GEMINI_MODEL if Google renames its models. */
export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
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

export class GeminiError extends Error {}

/** One Gemini call may take this long before we give up (override with GEMINI_TIMEOUT_MS). */
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30_000;

export async function generate(input: {
  system: string;
  contents: GeminiContent[];
  functions: FunctionDeclaration[];
}): Promise<GeminiContent | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent`;
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
  if (!res.ok) throw new GeminiError(`Gemini ${res.status}: ${data.error?.message ?? "request failed"}`);
  // no candidate usually means the prompt was blocked by safety filters
  return data.candidates?.[0]?.content ?? null;
}
