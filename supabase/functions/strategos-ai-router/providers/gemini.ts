import { ProviderError } from "../types.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TIMEOUT_MS = 30_000;

export interface GeminiTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface GeminiCallParams {
  apiKey: string;          // LOVABLE_API_KEY
  model: string;           // e.g. "google/gemini-2.5-flash-lite"
  systemPrompt: string;
  userMessage: string;
  tool: GeminiTool;
}

export async function callGemini(
  params: GeminiCallParams,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
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

    if (response.status === 429) {
      throw new ProviderError("Gemini rate limit", 429, "RATE_LIMIT", "gemini");
    }
    if (response.status === 402) {
      throw new ProviderError("Lovable AI credits exhausted", 402, "CREDITS", "gemini");
    }
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("Gemini gateway auth rejected", response.status, "AUTH", "gemini");
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini error", response.status, text);
      throw new ProviderError(`Gemini ${response.status}`, response.status, "PROVIDER_ERROR", "gemini");
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.error("Gemini tool_call missing", JSON.stringify(data));
      throw new ProviderError("No tool_call in response", 500, "PARSE_ERROR", "gemini");
    }
    try {
      return JSON.parse(argsStr) as Record<string, unknown>;
    } catch (e) {
      console.error("Gemini JSON parse failed", argsStr, e);
      throw new ProviderError("Bad JSON in tool_call", 500, "PARSE_ERROR", "gemini");
    }
  } finally {
    clearTimeout(timer);
  }
}