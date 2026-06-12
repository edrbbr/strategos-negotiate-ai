// Shared Anthropic helpers — used by every STRATEGOS / Retail-Shield edge function
// so the whole platform runs exclusively on Claude (Sonnet 4.5) for chat/JSON.
// Embeddings remain on the Lovable AI Gateway (google/gemini-embedding-001).

export const CLAUDE_MODEL = "claude-sonnet-4-5";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TIMEOUT_MS = 90_000;

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

interface BaseParams {
  apiKey: string;
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

async function rawCall(
  body: Record<string, unknown>,
  apiKey: string,
  timeoutMs: number,
): Promise<Response> {
  const doFetch = () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }).finally(() => clearTimeout(timer));
  };
  let res = await doFetch();
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 800));
    res = await doFetch();
  }
  return res;
}

/** Returns the parsed `input` of a forced tool_use call (strict JSON). */
export async function callAnthropicTool(
  params: BaseParams & { tool: AnthropicTool },
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  try {
    const res = await rawCall(
      {
        model: params.model ?? CLAUDE_MODEL,
        max_tokens: params.maxTokens ?? 2048,
        system: params.systemPrompt,
        tools: [params.tool],
        tool_choice: { type: "tool", name: params.tool.name },
        messages: [{ role: "user", content: params.userMessage }],
        ...(typeof params.temperature === "number" ? { temperature: params.temperature } : {}),
      },
      params.apiKey,
      params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("Anthropic tool error", res.status, txt.slice(0, 500));
      return { ok: false, status: res.status, error: txt.slice(0, 500) };
    }
    const data = await res.json();
    const block = (data?.content ?? []).find(
      (b: { type: string }) => b.type === "tool_use",
    );
    if (!block?.input || typeof block.input !== "object") {
      return { ok: false, status: 500, error: "no_tool_use_in_response" };
    }
    return { ok: true, data: block.input as Record<string, unknown> };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: aborted ? 504 : 500, error: aborted ? "timeout" : String(e) };
  }
}

/** Returns plain text completion. */
export async function callAnthropicText(
  params: BaseParams,
): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  try {
    const res = await rawCall(
      {
        model: params.model ?? CLAUDE_MODEL,
        max_tokens: params.maxTokens ?? 2048,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.userMessage }],
        ...(typeof params.temperature === "number" ? { temperature: params.temperature } : {}),
      },
      params.apiKey,
      params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("Anthropic text error", res.status, txt.slice(0, 500));
      return { ok: false, status: res.status, error: txt.slice(0, 500) };
    }
    const data = await res.json();
    const block = (data?.content ?? []).find((b: { type: string }) => b.type === "text");
    const text = String(block?.text ?? "").trim();
    return { ok: true, text };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: aborted ? 504 : 500, error: aborted ? "timeout" : String(e) };
  }
}

/** Vision: extract/OCR text from a single image attachment. */
export async function callAnthropicVisionExtract(args: {
  apiKey: string;
  mediaType: string; // e.g. "image/png", "application/pdf"
  base64: string;
  instruction: string;
  maxTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  // Anthropic supports image + (beta) pdf source blocks. Map non-image types to
  // "document" with media_type so PDFs work; otherwise fall back to image block.
  const mt = args.mediaType.toLowerCase();
  const isPdf = mt === "application/pdf";
  const isImage = mt.startsWith("image/");
  if (!isPdf && !isImage) {
    return { ok: false, status: 415, error: `unsupported_media_type:${mt}` };
  }
  try {
    const res = await rawCall(
      {
        model: CLAUDE_MODEL,
        max_tokens: args.maxTokens ?? 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: isPdf ? "document" : "image",
                source: { type: "base64", media_type: mt, data: args.base64 },
              },
              { type: "text", text: args.instruction },
            ],
          },
        ],
      },
      args.apiKey,
      DEFAULT_TIMEOUT_MS,
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("Anthropic vision error", res.status, txt.slice(0, 500));
      return { ok: false, status: res.status, error: txt.slice(0, 500) };
    }
    const data = await res.json();
    const block = (data?.content ?? []).find((b: { type: string }) => b.type === "text");
    const text = String(block?.text ?? "").trim();
    return { ok: true, text };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: aborted ? 504 : 500, error: aborted ? "timeout" : String(e) };
  }
}