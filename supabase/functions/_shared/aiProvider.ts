// Provider-Router: liest die globale `ai_provider_settings`-Tabelle und liefert
// drop-in Ersatz-Helfer für `callAnthropicTool/Text/VisionExtract`. Schaltet
// zwischen Anthropic Claude und Moonshot Kimi um — je nach Admin-Setting.

import {
  callAnthropicTool,
  callAnthropicText,
  callAnthropicVisionExtract,
  type AnthropicTool,
} from "./anthropic.ts";
import { callKimiTool, callKimiText, callKimiVisionExtract } from "./kimi.ts";

export interface AiProviderSettings {
  chat_provider: "anthropic" | "kimi";
  chat_model: string;
  vision_provider: "anthropic" | "kimi";
  vision_model: string;
}

const DEFAULTS: AiProviderSettings = {
  chat_provider: "anthropic",
  chat_model: "claude-sonnet-4-5",
  vision_provider: "anthropic",
  vision_model: "claude-sonnet-4-5",
};

// deno-lint-ignore no-explicit-any
export async function loadAiSettings(supabase: any): Promise<AiProviderSettings> {
  try {
    const { data } = await supabase
      .from("ai_provider_settings")
      .select("chat_provider, chat_model, vision_provider, vision_model")
      .eq("id", "global")
      .maybeSingle();
    if (!data) return DEFAULTS;
    return {
      chat_provider: (data.chat_provider === "kimi" ? "kimi" : "anthropic"),
      chat_model: data.chat_model || DEFAULTS.chat_model,
      vision_provider: (data.vision_provider === "kimi" ? "kimi" : "anthropic"),
      vision_model: data.vision_model || DEFAULTS.vision_model,
    };
  } catch (e) {
    console.warn("loadAiSettings fallback to defaults:", e);
    return DEFAULTS;
  }
}

interface CommonParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Routes Tool-Call (strict JSON) to the active chat provider.
 * `provider`/`model` are explicit; load them once via `loadAiSettings`.
 */
export async function callChatTool(args: CommonParams & {
  provider: "anthropic" | "kimi";
  model: string;
  tool: AnthropicTool;
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  if (args.provider === "kimi") {
    const apiKey = Deno.env.get("KIMI_API_KEY");
    if (!apiKey) return { ok: false, status: 500, error: "missing_KIMI_API_KEY" };
    return await callKimiTool({
      apiKey,
      model: args.model,
      systemPrompt: args.systemPrompt,
      userMessage: args.userMessage,
      maxTokens: args.maxTokens,
      temperature: args.temperature,
      timeoutMs: args.timeoutMs,
      tool: args.tool,
    });
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { ok: false, status: 500, error: "missing_ANTHROPIC_API_KEY" };
  return await callAnthropicTool({
    apiKey,
    model: args.model,
    systemPrompt: args.systemPrompt,
    userMessage: args.userMessage,
    maxTokens: args.maxTokens,
    temperature: args.temperature,
    timeoutMs: args.timeoutMs,
    tool: args.tool,
  });
}

/** Plain text completion routed to active chat provider. */
export async function callChatText(args: CommonParams & {
  provider: "anthropic" | "kimi";
  model: string;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  if (args.provider === "kimi") {
    const apiKey = Deno.env.get("KIMI_API_KEY");
    if (!apiKey) return { ok: false, status: 500, error: "missing_KIMI_API_KEY" };
    return await callKimiText({
      apiKey,
      model: args.model,
      systemPrompt: args.systemPrompt,
      userMessage: args.userMessage,
      maxTokens: args.maxTokens,
      temperature: args.temperature,
      timeoutMs: args.timeoutMs,
    });
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { ok: false, status: 500, error: "missing_ANTHROPIC_API_KEY" };
  return await callAnthropicText({
    apiKey,
    model: args.model,
    systemPrompt: args.systemPrompt,
    userMessage: args.userMessage,
    maxTokens: args.maxTokens,
    temperature: args.temperature,
    timeoutMs: args.timeoutMs,
  });
}

/** Vision extract routed to active vision provider. Falls back to Anthropic for PDFs. */
export async function callVisionExtract(args: {
  provider: "anthropic" | "kimi";
  model: string;
  mediaType: string;
  base64: string;
  instruction: string;
  maxTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const mt = args.mediaType.toLowerCase();
  // Kimi does not support PDFs in vision → fall back to Anthropic for PDFs.
  if (args.provider === "kimi" && mt.startsWith("image/")) {
    const apiKey = Deno.env.get("KIMI_API_KEY");
    if (!apiKey) return { ok: false, status: 500, error: "missing_KIMI_API_KEY" };
    return await callKimiVisionExtract({
      apiKey,
      mediaType: args.mediaType,
      base64: args.base64,
      instruction: args.instruction,
      maxTokens: args.maxTokens,
      model: args.model,
    });
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { ok: false, status: 500, error: "missing_ANTHROPIC_API_KEY" };
  return await callAnthropicVisionExtract({
    apiKey,
    mediaType: args.mediaType,
    base64: args.base64,
    instruction: args.instruction,
    maxTokens: args.maxTokens,
  });
}