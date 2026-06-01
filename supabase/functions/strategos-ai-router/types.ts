export type IconHint = 'car' | 'home' | 'cash' | 'document' | 'briefcase' | 'handshake';
export type EscalationLevel = 'auto' | 'soft' | 'neutral' | 'hard';
export type VariantKey = 'soft' | 'neutral' | 'hard';
export type SystemMode = 'information' | 'positioning' | 'negotiation' | 'closing' | 'defensive';

export interface KnowledgeSource {
  book_key: string;
  book_title: string;
  chapter: string | null;
  page: number | null;
  snippet: string;
}

export interface AnalysisDetail {
  goal_analysis?: string;
  counterparty_model?: string;
  power_analysis?: string;
  power_position?: 'weak' | 'balanced' | 'strong';
  counterparty_aggression?: 'low' | 'medium' | 'high';
  risk_analysis?: string;
  mode?: SystemMode;
  clarifying_questions?: string[];
  analysis?: string[];
}

export interface StrategosResult {
  title: string;
  icon_hint: IconHint;
  analysis: string[];
  strategy: string;
  draft: string;
  mode?: SystemMode | null;
  variants?: { soft: string; neutral: string; hard: string } | null;
  recommended_variant?: VariantKey | null;
  plan_steps?: string[] | null;
  clarifying_questions?: string[] | null;
  knowledge_sources?: KnowledgeSource[] | null;
}

export type StageName = 'analysis' | 'strategy' | 'draft';
export type ProviderName = 'anthropic' | 'openai' | 'gemini';

export interface PipelineStage {
  name: StageName;
  provider: ProviderName;
  model: string;
}

export interface PipelineConfig {
  type: 'multi_stage';
  stages: PipelineStage[];
}

export interface StageMeta {
  stage: StageName;
  model: string;
  latency_ms: number;
}

export interface PipelineMeta {
  type: 'multi_stage';
  stages: StageMeta[];
  total_latency_ms: number;
}

export interface PlanRow {
  id: string;
  model_id: string;
  case_limit: number | null;
  case_limit_type: string;
  pipeline_config: PipelineConfig | null;
  tier_key?: string;
  initial_attachments_limit?: number;
  allows_tonality?: boolean;
  allows_deep_doc_analysis?: boolean;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public provider: ProviderName,
  ) {
    super(message);
  }
}

export interface StrategyOption {
  key: string;
  label: string;
  prompt_hint: string | null;
}

export interface TonalityProfileRow {
  key: string;
  label: string;
  prompt_instruction: string;
}