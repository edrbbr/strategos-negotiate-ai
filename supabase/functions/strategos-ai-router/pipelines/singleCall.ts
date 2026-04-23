import { callAnthropic } from "../providers/anthropic.ts";
import { callGemini } from "../providers/gemini.ts";
import { SYSTEM_PROMPT } from "../prompts.ts";
import { ProviderError, type IconHint, type StrategosResult } from "../types.ts";

const FULL_TOOL_PARAMS = {
  type: "object",
  properties: {
    title: { type: "string", description: "Concise German case title (max 60 chars)." },
    icon_hint: {
      type: "string",
      enum: ["car", "home", "cash", "document", "briefcase", "handshake"],
    },
    analysis: {
      type: "array",
      items: { type: "string" },
      description: "German bullet points: counterparty weaknesses + power dynamic.",
    },
    strategy: {
      type: "string",
      description: "Tactic name + 2-sentence German explanation.",
    },
    draft: {
      type: "string",
      description: "Bulletproof email/script for the user to copy.",
    },
  },
  required: ["title", "icon_hint", "analysis", "strategy", "draft"],
  additionalProperties: false,
} as const;

const VALID_ICONS: IconHint[] = ["car", "home", "cash", "document", "briefcase", "handshake"];

function unwrapStrategy(raw: unknown): string {
  let s = String(raw ?? "").trim();
  for (let i = 0; i < 3; i++) {
    if (!s.startsWith("{")) break;
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && typeof parsed.strategy === "string") {
        s = parsed.strategy.trim();
        continue;
      }
      break;
    } catch {
      break;
    }
  }
  return s;
}

function coerce(out: Record<string, unknown>): StrategosResult {
  const icon = String(out.icon_hint ?? "briefcase") as IconHint;
  return {
    title: String(out.title ?? "Neuer Fall").slice(0, 80),
    icon_hint: VALID_ICONS.includes(icon) ? icon : "briefcase",
    analysis: Array.isArray(out.analysis) ? out.analysis.map(String) : [],
    strategy: unwrapStrategy(out.strategy),
    draft: String(out.draft ?? ""),
  };
}

export interface SingleCallParams {
  modelId: string;
  situationText: string;
  anthropicKey: string | null;
  lovableKey: string | null;
  medium?: string;
  languageLabel?: string;
  attachmentsContext?: string;
}

export async function runSingleCall(params: SingleCallParams): Promise<StrategosResult> {
  const { modelId, situationText, medium, languageLabel, attachmentsContext } = params;
  const userMessage = [
    `Target language: ${languageLabel ?? "Deutsch"}`,
    `Medium: ${medium ?? "email"}`,
    `Situation:\n"""\n${situationText}\n"""`,
    attachmentsContext ? `Reference documents:\n"""\n${attachmentsContext}\n"""` : null,
    `Produce the strategic evaluation strictly in the target language and matching the medium conventions.`,
  ].filter(Boolean).join("\n\n");

  // Provider-Auswahl anhand Model-Name
  if (modelId.startsWith("claude")) {
    if (!params.anthropicKey) {
      throw new ProviderError("MISSING_ANTHROPIC_KEY", 500, "MISSING_ANTHROPIC_KEY", "anthropic");
    }
    const out = await callAnthropic({
      apiKey: params.anthropicKey,
      model: modelId,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tool: {
        name: "return_strategos_analysis",
        description: "Return the elite negotiation analysis as a strict JSON object.",
        input_schema: FULL_TOOL_PARAMS,
      },
    });
    return coerce(out);
  }

  if (modelId.startsWith("google/")) {
    if (!params.lovableKey) {
      throw new ProviderError("MISSING_LOVABLE_KEY", 500, "MISSING_LOVABLE_KEY", "gemini");
    }
    const out = await callGemini({
      apiKey: params.lovableKey,
      model: modelId,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tool: {
        type: "function",
        function: {
          name: "return_strategos_analysis",
          description: "Return the elite negotiation analysis as a strict JSON object.",
          parameters: FULL_TOOL_PARAMS,
        },
      },
    });
    return coerce(out);
  }

  throw new ProviderError(
    `Unknown model_id: ${modelId}`,
    500,
    "UNKNOWN_MODEL",
    "anthropic",
  );
}