import { callAnthropic } from "../providers/anthropic.ts";
import { callGemini } from "../providers/gemini.ts";
import { callOpenAI } from "../providers/openai.ts";
import {
  PROMPT_ANALYSIS,
  PROMPT_DRAFT,
  PROMPT_STRATEGY,
  buildTierAddendum,
} from "../prompts.ts";
import {
  ProviderError,
  type EscalationLevel,
  type IconHint,
  type KnowledgeSource,
  type PipelineConfig,
  type StageMeta,
  type StrategosResult,
  type SystemMode,
  type VariantKey,
} from "../types.ts";

const VARIANT_KEYS: VariantKey[] = ["soft", "neutral", "hard"];
const MODE_KEYS: SystemMode[] = ["information", "positioning", "negotiation", "closing", "defensive"];

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    goal_analysis: { type: "string" },
    counterparty_model: { type: "string" },
    power_analysis: { type: "string" },
    power_position: { type: "string", enum: ["weak", "balanced", "strong"] },
    counterparty_aggression: { type: "string", enum: ["low", "medium", "high"] },
    risk_analysis: { type: "string" },
    mode: { type: "string", enum: MODE_KEYS },
    clarifying_questions: { type: "array", items: { type: "string" } },
    analysis: { type: "array", items: { type: "string" } },
  },
  required: [
    "goal_analysis",
    "counterparty_model",
    "power_analysis",
    "power_position",
    "counterparty_aggression",
    "risk_analysis",
    "mode",
    "analysis",
  ],
  additionalProperties: false,
} as const;

const STRATEGY_SCHEMA = {
  type: "object",
  properties: {
    framework_label: { type: "string", minLength: 3 },
    rationale: { type: "string", minLength: 80 },
    tactical_principles: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string", minLength: 20 },
    },
    recommended_variant: { type: "string", enum: VARIANT_KEYS },
  },
  required: ["framework_label", "rationale", "tactical_principles", "recommended_variant"],
  additionalProperties: false,
} as const;

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    icon_hint: {
      type: "string",
      enum: ["car", "home", "cash", "document", "briefcase", "handshake"],
    },
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
    draft: { type: "string" },
    plan_steps: { type: "array", items: { type: "string" } },
  },
  required: ["title", "icon_hint", "variants", "draft", "plan_steps"],
  additionalProperties: false,
} as const;

const VALID_ICONS: IconHint[] = ["car", "home", "cash", "document", "briefcase", "handshake"];

const DRAFT_MAX_TOKENS = 8000;

/**
 * Compose the final persisted strategy text from the structured tool output.
 * Validates that all required fields contain real content; throws ProviderError
 * with code "EMPTY_OUTPUT" when the model returned a stub (e.g. only the label).
 */
function composeStrategyText(out: Record<string, unknown>): {
  text: string;
  recommendedVariant: VariantKey;
} {
  const label = String(out.framework_label ?? "").trim();
  const rationale = String(out.rationale ?? "").trim();
  const principlesRaw = Array.isArray(out.tactical_principles) ? out.tactical_principles : [];
  const principles = principlesRaw.map((p) => String(p).trim()).filter((p) => p.length > 0);

  if (!label || rationale.length < 40 || principles.length < 2) {
    throw new ProviderError(
      `EMPTY_STRATEGY_OUTPUT label=${!!label} rationaleLen=${rationale.length} principles=${principles.length}`,
      502,
      "EMPTY_OUTPUT",
      "openai",
    );
  }

  const recRaw = (out.recommended_variant as VariantKey) ?? "soft";
  const recommendedVariant: VariantKey = VARIANT_KEYS.includes(recRaw) ? recRaw : "soft";
  const text = `${label}\n\n${rationale}\n\nTaktische Prinzipien:\n• ${principles.join("\n• ")}`;
  return { text, recommendedVariant };
}

/**
 * Validate the draft tool output before persisting. Throws ProviderError
 * "EMPTY_OUTPUT" if any of the three variants is missing/blank — this allows
 * the caller to surface a clean StageFailure instead of silently saving an
 * empty draft (root cause of the "leerer Entwurf" bug).
 */
function validateDraftOut(out: Record<string, unknown>): void {
  const v = (out?.variants ?? null) as Record<string, unknown> | null;
  const soft = v ? String(v.soft ?? "").trim() : "";
  const neutral = v ? String(v.neutral ?? "").trim() : "";
  const hard = v ? String(v.hard ?? "").trim() : "";
  if (!soft || !neutral || !hard) {
    throw new ProviderError(
      `EMPTY_DRAFT_VARIANTS soft=${soft.length} neutral=${neutral.length} hard=${hard.length}`,
      502,
      "EMPTY_OUTPUT",
      "anthropic",
    );
  }
}

/**
 * Defensive unwrapping for strategy strings.
 * Some providers occasionally return tool-call output where the inner field
 * is itself a JSON-encoded string like `{"strategy":"..."}`. We strip that wrapper
 * so consumers always see plain text.
 */
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

export interface StageCompletePayload {
  stage: 'analysis' | 'strategy' | 'draft';
  data: {
    analysis?: string[];
    strategy?: string;
    title?: string;
    icon_hint?: IconHint;
    draft?: string;
    model_used?: string;
    mode?: SystemMode | null;
    clarifying_questions?: string[] | null;
    recommended_variant?: VariantKey | null;
    variants?: { soft: string; neutral: string; hard: string } | null;
    plan_steps?: string[] | null;
    knowledge_sources?: KnowledgeSource[] | null;
  };
}

export interface MultiStageParams {
  config: PipelineConfig;
  situationText: string;
  anthropicKey: string | null;
  openaiKey: string | null;
  lovableKey?: string | null;
  onStageComplete?: (p: StageCompletePayload) => Promise<void>;
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

export interface MultiStageResult {
  result: StrategosResult;
  stageMetas: StageMeta[];
}

function getStage(cfg: PipelineConfig, name: string) {
  const s = cfg.stages.find((x) => x.name === name);
  if (!s) throw new ProviderError(`Missing stage ${name} in config`, 500, "BAD_PIPELINE_CONFIG", "anthropic");
  return s;
}

export async function runMultiStagePipeline(
  params: MultiStageParams,
): Promise<MultiStageResult> {
  const { config, situationText, anthropicKey, openaiKey, lovableKey, onStageComplete, medium, languageLabel, attachmentsContext } = params;
  const escalation: EscalationLevel = params.escalationLevel ?? "auto";
  const sources = params.knowledgeSources ?? [];
  const escalationLine = `User-chosen escalation_level: ${escalation}`;
  const knowledgeBlock = params.knowledgeContext
    ? `\n\nRetrieved book passages (background only, do not quote verbatim):\n"""\n${params.knowledgeContext}\n"""`
    : "";
  const tierAddendum = buildTierAddendum({
    allowedStrategies: params.allowedStrategies ?? [],
    tonalityInstruction: params.tonalityInstruction ?? null,
    enableDeepDocAnalysis: !!params.enableDeepDocAnalysis,
    hasAttachments: !!attachmentsContext && attachmentsContext.length > 0,
  });
  const promptAnalysis = `${PROMPT_ANALYSIS}${tierAddendum}`;
  const promptStrategy = `${PROMPT_STRATEGY}${tierAddendum}`;
  const promptDraft = `${PROMPT_DRAFT}${tierAddendum}`;
  const langLine = `Target language: ${languageLabel ?? "Deutsch"}`;
  const mediumLine = `Medium: ${medium ?? "email"}`;
  const attachLine = attachmentsContext ? `\n\nReference documents:\n"""\n${attachmentsContext}\n"""` : "";
  const baseHeader = `${langLine}\n${mediumLine}\n${escalationLine}`;
  const stageMetas: StageMeta[] = [];

  // ---- Stage 1: Analysis ----
  const s1 = getStage(config, "analysis");
  if (s1.provider === "anthropic" && !anthropicKey) {
    throw new ProviderError("MISSING_ANTHROPIC_KEY", 500, "MISSING_ANTHROPIC_KEY", "anthropic");
  }
  const t1 = Date.now();
  let analysisOut: Record<string, unknown>;
  try {
    analysisOut = await callAnthropic({
      apiKey: anthropicKey!,
      model: s1.model,
      systemPrompt: promptAnalysis,
      userMessage: `${baseHeader}\n\nSituation:\n"""\n${situationText}\n"""${attachLine}${knowledgeBlock}`,
      tool: {
        name: "return_analysis",
        description: "Return the analysis bullets.",
        input_schema: ANALYSIS_SCHEMA,
      },
    });
  } catch (e) {
    throw stageError("analysis", [], e);
  }
  const lat1 = Date.now() - t1;
  const analysis = (Array.isArray(analysisOut.analysis) ? analysisOut.analysis : []).map(String);
  const mode = MODE_KEYS.includes(analysisOut.mode as SystemMode) ? (analysisOut.mode as SystemMode) : null;
  const clarifying = Array.isArray(analysisOut.clarifying_questions)
    ? analysisOut.clarifying_questions.map(String)
    : [];
  stageMetas.push({ stage: "analysis", model: s1.model, latency_ms: lat1 });
  await onStageComplete?.({
    stage: "analysis",
    data: {
      analysis,
      mode,
      clarifying_questions: clarifying,
      knowledge_sources: sources.length > 0 ? sources : null,
      model_used: `multi:${s1.model}`,
    },
  });

  // ---- Stage 2: Strategy ----
  const s2 = getStage(config, "strategy");
  if (s2.provider === "openai" && !openaiKey) {
    throw stageError("strategy", ["analysis"], new ProviderError("MISSING_OPENAI_KEY", 500, "MISSING_OPENAI_KEY", "openai"));
  }
  const t2 = Date.now();
  let strategyOut: Record<string, unknown>;
  try {
    const analysisJson = JSON.stringify({
      ...analysisOut,
      analysis,
    });
    const strategyUserMessage = `${baseHeader}\n\nSituation:\n"""\n${situationText}\n"""\n\nAnalysis (JSON):\n${analysisJson}${attachLine}${knowledgeBlock}`;
    try {
      strategyOut = await callOpenAI({
        apiKey: openaiKey!,
        model: s2.model,
        systemPrompt: promptStrategy,
        userMessage: strategyUserMessage,
        tool: {
          type: "function",
          function: {
            name: "return_strategy",
            description: "Return the chosen strategic framework.",
            parameters: STRATEGY_SCHEMA,
          },
        },
      });
    } catch (e) {
      const canFallback =
        e instanceof ProviderError &&
        (e.code === "RATE_LIMIT" || e.code === "TIMEOUT") &&
        !!lovableKey;
      if (!canFallback) throw e;
      strategyOut = await callGemini({
        apiKey: lovableKey,
        model: "google/gemini-2.5-flash",
        systemPrompt: promptStrategy,
        userMessage: strategyUserMessage,
        tool: {
          type: "function",
          function: {
            name: "return_strategy",
            description: "Return the chosen strategic framework.",
            parameters: STRATEGY_SCHEMA,
          },
        },
      });
      stageMetas.push({ stage: "strategy", model: "google/gemini-2.5-flash", latency_ms: Date.now() - t2 });
      let strategy: string;
      let recommendedVariant: VariantKey;
      try {
        const composed = composeStrategyText(strategyOut);
        strategy = composed.text;
        recommendedVariant = composed.recommendedVariant;
      } catch (validationErr) {
        throw stageError("strategy", ["analysis"], validationErr);
      }
      await onStageComplete?.({ stage: "strategy", data: { strategy, recommended_variant: recommendedVariant } });

      const s3 = getStage(config, "draft");
      const t3 = Date.now();
      let draftOut: Record<string, unknown>;
      try {
        draftOut = await runDraftWithFallback({
          anthropicKey: anthropicKey!,
          lovableKey,
          model: s3.model,
          promptDraft,
          userMessage: `${baseHeader}\n\nSituation:\n"""\n${situationText}\n"""\n\nAnalysis:\n${analysis.join("\n")}\n\nStrategy:\n${strategy}\n\nrecommended_variant: ${recommendedVariant}${attachLine}${knowledgeBlock}`,
        });
      } catch (draftError) {
        throw stageError("draft", ["analysis", "strategy"], draftError);
      }
      const lat3 = Date.now() - t3;
      const fbResult = finalizeDraft({
        draftOut, analysis, strategy, recommendedVariant, mode, clarifying, sources,
      });
      stageMetas.push({ stage: "draft", model: s3.model, latency_ms: lat3 });
      await onStageComplete?.({
        stage: "draft",
        data: {
          title: fbResult.title,
          icon_hint: fbResult.icon_hint,
          draft: fbResult.draft,
          variants: fbResult.variants,
          plan_steps: fbResult.plan_steps,
          recommended_variant: recommendedVariant,
          model_used: "multi_stage_elite",
        },
      });
      return { result: fbResult, stageMetas };
    }
  } catch (e) {
    throw stageError("strategy", ["analysis"], e);
  }
  const lat2 = Date.now() - t2;
  let strategy: string;
  let recommendedVariant: VariantKey;
  try {
    const composed = composeStrategyText(strategyOut);
    strategy = composed.text;
    recommendedVariant = composed.recommendedVariant;
  } catch (validationErr) {
    throw stageError("strategy", ["analysis"], validationErr);
  }
  stageMetas.push({ stage: "strategy", model: s2.model, latency_ms: lat2 });
  await onStageComplete?.({ stage: "strategy", data: { strategy, recommended_variant: recommendedVariant } });

  // ---- Stage 3: Draft ----
  const s3 = getStage(config, "draft");
  const t3 = Date.now();
  let draftOut: Record<string, unknown>;
  try {
    draftOut = await runDraftWithFallback({
      anthropicKey: anthropicKey!,
      lovableKey,
      model: s3.model,
      promptDraft,
      userMessage: `${baseHeader}\n\nSituation:\n"""\n${situationText}\n"""\n\nAnalysis:\n${analysis.join("\n")}\n\nStrategy:\n${strategy}\n\nrecommended_variant: ${recommendedVariant}${attachLine}${knowledgeBlock}`,
    });
  } catch (e) {
    throw stageError("draft", ["analysis", "strategy"], e);
  }
  const lat3 = Date.now() - t3;
  const finalized = finalizeDraft({
    draftOut, analysis, strategy, recommendedVariant, mode, clarifying, sources,
  });
  stageMetas.push({ stage: "draft", model: s3.model, latency_ms: lat3 });
  await onStageComplete?.({
    stage: "draft",
    data: {
      title: finalized.title,
      icon_hint: finalized.icon_hint,
      draft: finalized.draft,
      variants: finalized.variants,
      plan_steps: finalized.plan_steps,
      recommended_variant: recommendedVariant,
      model_used: "multi_stage_elite",
    },
  });
  return { result: finalized, stageMetas };
}

function finalizeDraft(args: {
  draftOut: Record<string, unknown>;
  analysis: string[];
  strategy: string;
  recommendedVariant: VariantKey;
  mode: SystemMode | null;
  clarifying: string[];
  sources: KnowledgeSource[];
}): StrategosResult {
  const { draftOut, analysis, strategy, recommendedVariant, mode, clarifying, sources } = args;
  const icon = String(draftOut.icon_hint ?? "briefcase") as IconHint;
  const title = String(draftOut.title ?? "Neuer Fall").slice(0, 80);
  const rawVariants = (draftOut.variants ?? null) as Record<string, unknown> | null;
  const variants = rawVariants
    ? {
        soft: String(rawVariants.soft ?? ""),
        neutral: String(rawVariants.neutral ?? ""),
        hard: String(rawVariants.hard ?? ""),
      }
    : null;
  const draft = String(draftOut.draft ?? (variants ? variants[recommendedVariant] : ""));
  const planSteps = Array.isArray(draftOut.plan_steps) ? draftOut.plan_steps.map(String) : null;
  return {
    title,
    icon_hint: VALID_ICONS.includes(icon) ? icon : "briefcase",
    analysis,
    strategy,
    draft,
    mode,
    variants,
    recommended_variant: recommendedVariant,
    plan_steps: planSteps,
    clarifying_questions: clarifying.length > 0 ? clarifying : null,
    knowledge_sources: sources.length > 0 ? sources : null,
  };
}

export interface StageFailure {
  isStageFailure: true;
  stage: 'analysis' | 'strategy' | 'draft';
  completedStages: string[];
  cause: ProviderError | Error;
}

function stageError(
  stage: 'analysis' | 'strategy' | 'draft',
  completed: string[],
  cause: unknown,
): StageFailure {
  return {
    isStageFailure: true,
    stage,
    completedStages: completed,
    cause: cause instanceof Error ? cause : new Error(String(cause)),
  };
}

export function isStageFailure(e: unknown): e is StageFailure {
  return typeof e === "object" && e !== null && (e as StageFailure).isStageFailure === true;
}