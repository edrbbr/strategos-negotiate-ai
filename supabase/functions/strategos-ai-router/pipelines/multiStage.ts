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
  type IconHint,
  type PipelineConfig,
  type StageMeta,
  type StrategosResult,
} from "../types.ts";

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    analysis: { type: "array", items: { type: "string" } },
  },
  required: ["analysis"],
  additionalProperties: false,
} as const;

const STRATEGY_SCHEMA = {
  type: "object",
  properties: { strategy: { type: "string" } },
  required: ["strategy"],
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
    draft: { type: "string" },
  },
  required: ["title", "icon_hint", "draft"],
  additionalProperties: false,
} as const;

const VALID_ICONS: IconHint[] = ["car", "home", "cash", "document", "briefcase", "handshake"];

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
      userMessage: `${langLine}\n${mediumLine}\n\nSituation:\n"""\n${situationText}\n"""${attachLine}`,
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
  stageMetas.push({ stage: "analysis", model: s1.model, latency_ms: lat1 });
  await onStageComplete?.({ stage: "analysis", data: { analysis, model_used: `multi:${s1.model}` } });

  // ---- Stage 2: Strategy ----
  const s2 = getStage(config, "strategy");
  if (s2.provider === "openai" && !openaiKey) {
    throw stageError("strategy", ["analysis"], new ProviderError("MISSING_OPENAI_KEY", 500, "MISSING_OPENAI_KEY", "openai"));
  }
  const t2 = Date.now();
  let strategyOut: Record<string, unknown>;
  try {
    const strategyUserMessage = `${langLine}\n${mediumLine}\n\nSituation:\n"""\n${situationText}\n"""\n\nAnalysis:\n${analysis.map((b) => "- " + b).join("\n")}${attachLine}`;
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
      if (!(e instanceof ProviderError) || e.code !== "RATE_LIMIT" || !lovableKey) throw e;
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
      const strategy = unwrapStrategy(strategyOut.strategy);
      await onStageComplete?.({ stage: "strategy", data: { strategy } });

      const s3 = getStage(config, "draft");
      const t3 = Date.now();
      let draftOut: Record<string, unknown>;
      try {
        draftOut = await callAnthropic({
          apiKey: anthropicKey!,
          model: s3.model,
          systemPrompt: promptDraft,
          userMessage: `${langLine}\n${mediumLine}\n\nSituation:\n"""\n${situationText}\n"""\n\nAnalysis:\n${analysis.join("\n")}\n\nStrategy:\n${strategy}${attachLine}`,
          tool: {
            name: "return_draft",
            description: "Return the final draft, title and icon hint.",
            input_schema: DRAFT_SCHEMA,
          },
        });
      } catch (draftError) {
        throw stageError("draft", ["analysis", "strategy"], draftError);
      }
      const lat3 = Date.now() - t3;
      const icon = String(draftOut.icon_hint ?? "briefcase") as IconHint;
      const title = String(draftOut.title ?? "Neuer Fall").slice(0, 80);
      const draft = String(draftOut.draft ?? "");
      stageMetas.push({ stage: "draft", model: s3.model, latency_ms: lat3 });
      await onStageComplete?.({
        stage: "draft",
        data: {
          title,
          icon_hint: VALID_ICONS.includes(icon) ? icon : "briefcase",
          draft,
          model_used: "multi_stage_elite",
        },
      });

      return {
        result: {
          title,
          icon_hint: VALID_ICONS.includes(icon) ? icon : "briefcase",
          analysis,
          strategy,
          draft,
        },
        stageMetas,
      };
    }
  } catch (e) {
    throw stageError("strategy", ["analysis"], e);
  }
  const lat2 = Date.now() - t2;
  const strategy = unwrapStrategy(strategyOut.strategy);
  stageMetas.push({ stage: "strategy", model: s2.model, latency_ms: lat2 });
  await onStageComplete?.({ stage: "strategy", data: { strategy } });

  // ---- Stage 3: Draft ----
  const s3 = getStage(config, "draft");
  const t3 = Date.now();
  let draftOut: Record<string, unknown>;
  try {
    draftOut = await callAnthropic({
      apiKey: anthropicKey!,
      model: s3.model,
      systemPrompt: promptDraft,
      userMessage: `${langLine}\n${mediumLine}\n\nSituation:\n"""\n${situationText}\n"""\n\nAnalysis:\n${analysis.join("\n")}\n\nStrategy:\n${strategy}${attachLine}`,
      tool: {
        name: "return_draft",
        description: "Return the final draft, title and icon hint.",
        input_schema: DRAFT_SCHEMA,
      },
    });
  } catch (e) {
    throw stageError("draft", ["analysis", "strategy"], e);
  }
  const lat3 = Date.now() - t3;
  const icon = String(draftOut.icon_hint ?? "briefcase") as IconHint;
  const title = String(draftOut.title ?? "Neuer Fall").slice(0, 80);
  const draft = String(draftOut.draft ?? "");
  stageMetas.push({ stage: "draft", model: s3.model, latency_ms: lat3 });
  await onStageComplete?.({
    stage: "draft",
    data: {
      title,
      icon_hint: VALID_ICONS.includes(icon) ? icon : "briefcase",
      draft,
      model_used: "multi_stage_elite",
    },
  });

  return {
    result: {
      title,
      icon_hint: VALID_ICONS.includes(icon) ? icon : "briefcase",
      analysis,
      strategy,
      draft,
    },
    stageMetas,
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