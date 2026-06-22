// Shared Moonshot/Kimi helpers — OpenAI-compatible Chat Completions API.
// Mirrors the surface of `_shared/anthropic.ts` so it can be swapped in 1:1.

export const KIMI_MODEL = "kimi-k2-0905-preview";

const KIMI_URL = "https://api.moonshot.ai/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 90_000;

export interface KimiTool {
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
    return fetch(KIMI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
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

/** Returns parsed tool_call arguments JSON, forcing the named tool. */
export async function callKimiTool(
  params: BaseParams & { tool: KimiTool },
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  try {
    const res = await rawCall(
      {
        model: params.model ?? KIMI_MODEL,
        max_tokens: params.maxTokens ?? 4096,
        temperature: typeof params.temperature === "number" ? params.temperature : 0.3,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userMessage },
        ],
        tools: [{
          type: "function",
          function: {
            name: params.tool.name,
            description: params.tool.description ?? "",
            parameters: params.tool.input_schema,
          },
        }],
        tool_choice: { type: "function", function: { name: params.tool.name } },
      },
      params.apiKey,
      params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("Kimi tool error", res.status, txt.slice(0, 500));
      return { ok: false, status: res.status, error: txt.slice(0, 500) };
    }
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    const call = msg?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (!argsStr) return { ok: false, status: 500, error: "no_tool_call_in_response" };
    try {
      const parsed = JSON.parse(argsStr);
      if (parsed && typeof parsed === "object") {
        return { ok: true, data: parsed as Record<string, unknown> };
      }
      return { ok: false, status: 500, error: "tool_call_not_object" };
    } catch (e) {
      return { ok: false, status: 500, error: `tool_call_parse: ${String(e)}` };
    }
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: aborted ? 504 : 500, error: aborted ? "timeout" : String(e) };
  }
}

/** Plain text completion. */
export async function callKimiText(
  params: BaseParams,
): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  try {
    const res = await rawCall(
      {
        model: params.model ?? KIMI_MODEL,
        max_tokens: params.maxTokens ?? 2048,
        temperature: typeof params.temperature === "number" ? params.temperature : 0.5,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userMessage },
        ],
      },
      params.apiKey,
      params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error("Kimi text error", res.status, txt.slice(0, 500));
      return { ok: false, status: res.status, error: txt.slice(0, 500) };
    }
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    return { ok: true, text };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: aborted ? 504 : 500, error: aborted ? "timeout" : String(e) };
  }
}

/** Vision-Extract: send a base64 image with an instruction. PDFs are not supported by Kimi vision. */
export async function callKimiVisionExtract(args: {
  apiKey: string;
  mediaType: string;
  base64: string;
  instruction: string;
  maxTokens?: number;
  model?: string;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const mt = args.mediaType.toLowerCase();
  if (!mt.startsWith("image/")) {
    return { ok: false, status: 415, error: `kimi_vision_unsupported_media_type:${mt}` };
  }
  try {
    const res = await rawCall(
      {
        model: args.model ?? KIMI_MODEL,
        max_tokens: args.maxTokens ?? 2000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mt};base64,${args.base64}` } },
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
      console.error("Kimi vision error", res.status, txt.slice(0, 500));
      return { ok: false, status: res.status, error: txt.slice(0, 500) };
    }
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    return { ok: true, text };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return { ok: false, status: aborted ? 504 : 500, error: aborted ? "timeout" : String(e) };
  }
}