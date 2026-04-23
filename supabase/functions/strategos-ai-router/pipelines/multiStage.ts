import { callAnthropic } from "../providers/anthropic.ts";
import { callOpenAI } from "../providers/openai.ts";
import {
  PROMPT_ANALYSIS,
  PROMPT_DRAFT,
  PROMPT_STRATEGY,
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
  onStageComplete?: (p: StageCompletePayload) => Promise<void>;
  medium?: string;
  languageLabel?: string;
  attachmentsContext?: string;
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
  const { config, situationText, anthropicKey, openaiKey, onStageComplete, medium, languageLabel, attachmentsContext } = params;
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
      systemPrompt: PROMPT_ANALYSIS,
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
    strategyOut = await callOpenAI({
      apiKey: openaiKey!,
      model: s2.model,
      systemPrompt: PROMPT_STRATEGY,
      userMessage: `${langLine}\n${mediumLine}\n\nSituation:\n"""\n${situationText}\n"""\n\nAnalysis:\n${analysis.map((b) => "- " + b).join("\n")}${attachLine}`,
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
    throw stageError("strategy", ["analysis"], e);
  }
  const lat2 = Date.now() - t2;
  const strategy = String(strategyOut.strategy ?? "");
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
      systemPrompt: PROMPT_DRAFT,
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