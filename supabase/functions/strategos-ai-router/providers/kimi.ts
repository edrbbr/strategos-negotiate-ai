import { ProviderError } from "../types.ts";

const KIMI_URL = "https://api.moonshot.ai/v1/chat/completions";
const TIMEOUT_MS = 90_000;

export interface KimiTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface KimiCallParams {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  tool: KimiTool;
  maxTokens?: number;
}

/**
 * Calls Moonshot/Kimi Chat Completions with a forced tool call, returning
 * the parsed JSON arguments of the chosen tool. Mirrors `callAnthropic`'s
 * throw-on-error contract so the pipeline can drop it in.
 */
export async function callKimi(params: KimiCallParams): Promise<Record<string, unknown>> {
  const doFetch = () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return fetch(KIMI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens ?? 8000,
        temperature: 0.3,
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
      }),
    }).finally(() => clearTimeout(timer));
  };

  try {
    let response = await doFetch();
    if (response.status === 429 || response.status >= 500) {
      await new Promise((r) => setTimeout(r, 800));
      response = await doFetch();
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("Kimi auth rejected", response.status, "AUTH", "anthropic");
    }
    if (response.status === 404) {
      throw new ProviderError(
        `MODEL_NOT_AVAILABLE: ${params.model}`,
        404,
        "MODEL_NOT_AVAILABLE",
        "anthropic",
      );
    }
    if (response.status === 429) {
      throw new ProviderError("Kimi rate limit", 429, "RATE_LIMIT", "anthropic");
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("Kimi error", response.status, text);
      throw new ProviderError(`Kimi ${response.status}`, response.status, "PROVIDER_ERROR", "anthropic");
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (!argsStr) {
      console.error("Kimi tool_call missing", JSON.stringify(data).slice(0, 800));
      throw new ProviderError("No tool_call in Kimi response", 500, "PARSE_ERROR", "anthropic");
    }
    try {
      const parsed = JSON.parse(argsStr);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("not_object");
      }
      return parsed as Record<string, unknown>;
    } catch (e) {
      console.error("Kimi tool args parse failed", String(e), argsStr.slice(0, 500));
      throw new ProviderError("Kimi tool args parse failed", 500, "PARSE_ERROR", "anthropic");
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ProviderError("Kimi request timed out", 504, "TIMEOUT", "anthropic");
    }
    throw e;
  }
}