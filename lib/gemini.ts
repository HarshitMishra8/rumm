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

export async function generate(input: {
  system: string;
  contents: GeminiContent[];
  functions: FunctionDeclaration[];
}): Promise<GeminiContent | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: input.contents,
      tools: [{ functionDeclarations: input.functions }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: GeminiContent; finishReason?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new GeminiError(`Gemini ${res.status}: ${data.error?.message ?? "request failed"}`);
  // no candidate usually means the prompt was blocked by safety filters
  return data.candidates?.[0]?.content ?? null;
}
