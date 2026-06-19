import { callAnthropic } from "../providers/anthropic.ts";
import { callGemini } from "../providers/gemini.ts";
import { SYSTEM_PROMPT, buildTierAddendum } from "../prompts.ts";
import {
  ProviderError,
  type EscalationLevel,
  type IconHint,
  type KnowledgeSource,
  type StrategosResult,
  type SystemMode,
  type VariantKey,
} from "../types.ts";

const VARIANT_KEYS: VariantKey[] = ["soft", "neutral", "hard"];
const MODE_KEYS: SystemMode[] = ["information", "positioning", "negotiation", "closing", "defensive"];

const FULL_TOOL_PARAMS = {
  type: "object",
  properties: {
    title: { type: "string", description: "Concise case title in the target language (max 60 chars)." },
    icon_hint: {
      type: "string",
      enum: ["car", "home", "cash", "document", "briefcase", "handshake"],
    },
    mode: { type: "string", enum: MODE_KEYS },
    analysis: {
      type: "array",
      items: { type: "string" },
      description: "3-5 synthesis bullets in the target language.",
    },
    clarifying_questions: {
      type: "array",
      items: { type: "string" },
      description: "0-3 targeted questions; empty when nothing critical is missing.",
    },
    strategy: {
      type: "string",
      description: "Framework + 2 sentences in target language explaining the fit.",
    },
    recommended_variant: { type: "string", enum: VARIANT_KEYS },
    variants: {
      type: "object",
      properties: {
        soft: { type: "string" },
        neutral: { type: "string" },
        hard: { type: "string" },
      },
      required: ["soft", "neutral", "hard"],
      additionalProperties: false,
    },
    draft: { type: "string", description: "Copy of variants[recommended_variant] for backwards compat." },
    plan_steps: { type: "array", items: { type: "string" }, description: "3-5 concrete ordered next steps." },
  },
  required: [
    "title",
    "icon_hint",
    "mode",
    "analysis",
    "strategy",
    "recommended_variant",
    "variants",
    "draft",
    "plan_steps",
  ],
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

function coerce(out: Record<string, unknown>, sources: KnowledgeSource[]): StrategosResult {
  const icon = String(out.icon_hint ?? "briefcase") as IconHint;
  const mode = String(out.mode ?? "") as SystemMode;
  const rec = String(out.recommended_variant ?? "soft") as VariantKey;
  const rawVariants = (out.variants ?? null) as Record<string, unknown> | null;
  const variants = rawVariants
    ? {
        soft: String(rawVariants.soft ?? ""),
        neutral: String(rawVariants.neutral ?? ""),
        hard: String(rawVariants.hard ?? ""),
      }
    : null;
  const recommended = VARIANT_KEYS.includes(rec) ? rec : "soft";
  const draft = String(out.draft ?? (variants ? variants[recommended] : ""));
  return {
    title: String(out.title ?? "Neuer Fall").slice(0, 80),
    icon_hint: VALID_ICONS.includes(icon) ? icon : "briefcase",
    analysis: Array.isArray(out.analysis) ? out.analysis.map(String) : [],
    strategy: unwrapStrategy(out.strategy),
    draft,
    mode: MODE_KEYS.includes(mode) ? mode : null,
    variants,
    recommended_variant: recommended,
    plan_steps: Array.isArray(out.plan_steps) ? out.plan_steps.map(String) : null,
    clarifying_questions: Array.isArray(out.clarifying_questions)
      ? out.clarifying_questions.map(String)
      : null,
    knowledge_sources: sources.length > 0 ? sources : null,
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
  allowedStrategies?: { key: string; label: string; prompt_hint: string | null }[];
  tonalityInstruction?: string | null;
  enableDeepDocAnalysis?: boolean;
  escalationLevel?: EscalationLevel;
  knowledgeContext?: string;
  knowledgeSources?: KnowledgeSource[];
}

export async function runSingleCall(params: SingleCallParams): Promise<StrategosResult> {
  const { modelId, situationText, medium, languageLabel, attachmentsContext } = params;
  const escalation: EscalationLevel = params.escalationLevel ?? "auto";
  const sources = params.knowledgeSources ?? [];
  const addendum = buildTierAddendum({
    allowedStrategies: params.allowedStrategies ?? [],
    tonalityInstruction: params.tonalityInstruction ?? null,
    enableDeepDocAnalysis: !!params.enableDeepDocAnalysis,
    hasAttachments: !!attachmentsContext && attachmentsContext.length > 0,
  });
  const systemPrompt = `${SYSTEM_PROMPT}${addendum}`;
  const userMessage = [
    `Target language: ${languageLabel ?? "Deutsch"}`,
    `Medium: ${medium ?? "email"}`,
    `User-chosen escalation_level: ${escalation}`,
    `Situation:\n"""\n${situationText}\n"""`,
    attachmentsContext ? `Reference documents:\n"""\n${attachmentsContext}\n"""` : null,
    params.knowledgeContext
      ? `Retrieved book passages (use as background reasoning, do NOT quote verbatim):\n"""\n${params.knowledgeContext}\n"""`
      : null,
    `Produce the strategic evaluation strictly in the target language and matching the medium conventions. Return ALL required fields including the three variants.`,
  ].filter(Boolean).join("\n\n");

  // Provider-Auswahl anhand Model-Name
  if (modelId.startsWith("claude")) {
    if (!params.anthropicKey) {
      throw new ProviderError("MISSING_ANTHROPIC_KEY", 500, "MISSING_ANTHROPIC_KEY", "anthropic");
    }
    const out = await callAnthropic({
      apiKey: params.anthropicKey,
      model: modelId,
      systemPrompt,
      userMessage,
      maxTokens: 8000,
      tool: {
        name: "return_strategos_analysis",
        description: "Return the elite negotiation analysis as a strict JSON object.",
        input_schema: FULL_TOOL_PARAMS,
      },
    });
    return coerce(out, sources);
  }

  if (modelId.startsWith("google/")) {
    if (!params.lovableKey) {
      throw new ProviderError("MISSING_LOVABLE_KEY", 500, "MISSING_LOVABLE_KEY", "gemini");
    }
    const out = await callGemini({
      apiKey: params.lovableKey,
      model: modelId,
      systemPrompt,
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
    return coerce(out, sources);
  }

  throw new ProviderError(
    `Unknown model_id: ${modelId}`,
    500,
    "UNKNOWN_MODEL",
    "anthropic",
  );
}