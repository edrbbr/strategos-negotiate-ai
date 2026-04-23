export type IconHint = 'car' | 'home' | 'cash' | 'document' | 'briefcase' | 'handshake';

export interface StrategosResult {
  title: string;
  icon_hint: IconHint;
  analysis: string[];
  strategy: string;
  draft: string;
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