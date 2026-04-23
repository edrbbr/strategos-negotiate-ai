import { ProviderError } from "../types.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 90_000;

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicCallParams {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  tool: AnthropicTool;
  maxTokens?: number;
}

/**
 * Calls Anthropic Messages API with forced tool use for strict JSON.
 * Returns the parsed `input` object of the tool call.
 */
export async function callAnthropic(
  params: AnthropicCallParams,
): Promise<Record<string, unknown>> {
  // Fresh controller per attempt so retries aren't poisoned by a prior abort.
  const doFetch = () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": params.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens ?? 2048,
        system: params.systemPrompt,
        tools: [params.tool],
        tool_choice: { type: "tool", name: params.tool.name },
        messages: [{ role: "user", content: params.userMessage }],
      }),
    }).finally(() => clearTimeout(timer));
  };

  try {
    let response = await doFetch();
    if (response.status === 429 || response.status >= 500) {
      // 1x retry
      await new Promise((r) => setTimeout(r, 800));
      response = await doFetch();
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("Anthropic auth rejected", response.status, "AUTH", "anthropic");
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
      throw new ProviderError("Anthropic rate limit", 429, "RATE_LIMIT", "anthropic");
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("Anthropic error", response.status, text);
      throw new ProviderError(`Anthropic ${response.status}`, response.status, "PROVIDER_ERROR", "anthropic");
    }

    const data = await response.json();
    const block = (data?.content ?? []).find(
      (b: { type: string }) => b.type === "tool_use",
    );
    if (!block?.input || typeof block.input !== "object") {
      console.error("Anthropic tool_use missing", JSON.stringify(data));
      throw new ProviderError("No tool_use in response", 500, "PARSE_ERROR", "anthropic");
    }
    return block.input as Record<string, unknown>;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ProviderError("Anthropic request timed out", 504, "TIMEOUT", "anthropic");
    }
    throw e;
  }
}