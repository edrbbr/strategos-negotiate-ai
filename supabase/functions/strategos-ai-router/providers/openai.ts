import { ProviderError } from "../types.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 30_000;

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAICallParams {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  tool: OpenAITool;
}

export async function callOpenAI(
  params: OpenAICallParams,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const doFetch = () =>
    fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userMessage },
        ],
        tools: [params.tool],
        tool_choice: {
          type: "function",
          function: { name: params.tool.function.name },
        },
      }),
    });

  try {
    let response = await doFetch();
    // Retry on 429/5xx with exponential backoff + jitter, honoring Retry-After
    const maxRetries = 4;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (response.status !== 429 && response.status < 500) break;
      const retryAfter = Number(response.headers.get("retry-after"));
      const base = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 800 * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 400);
      await new Promise((r) => setTimeout(r, base + jitter));
      response = await doFetch();
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("OpenAI auth rejected", response.status, "AUTH", "openai");
    }
    if (response.status === 404) {
      throw new ProviderError(
        `MODEL_NOT_AVAILABLE: ${params.model}`,
        404,
        "MODEL_NOT_AVAILABLE",
        "openai",
      );
    }
    if (response.status === 429) {
      throw new ProviderError("OpenAI rate limit", 429, "RATE_LIMIT", "openai");
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error", response.status, text);
      throw new ProviderError(`OpenAI ${response.status}`, response.status, "PROVIDER_ERROR", "openai");
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.error("OpenAI tool_call missing", JSON.stringify(data));
      throw new ProviderError("No tool_call in response", 500, "PARSE_ERROR", "openai");
    }
    try {
      return JSON.parse(argsStr) as Record<string, unknown>;
    } catch (e) {
      console.error("OpenAI JSON parse failed", argsStr, e);
      throw new ProviderError("Bad JSON in tool_call", 500, "PARSE_ERROR", "openai");
    }
  } finally {
    clearTimeout(timer);
  }
}