-- 1) cases-Tabelle
CREATE TABLE public.cases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL DEFAULT 'Neuer Fall',
  icon_hint         TEXT NOT NULL DEFAULT 'briefcase'
    CHECK (icon_hint IN ('car','home','cash','document','briefcase','handshake')),
  situation_text    TEXT,
  analysis          JSONB,                -- string[]
  strategy          TEXT,
  draft             TEXT,
  model_used        TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','archived')),
  last_analyzed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_cases_user_updated ON public.cases(user_id, updated_at DESC);

-- 2) RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cases"
  ON public.cases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases"
  ON public.cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON public.cases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases"
  ON public.cases FOR DELETE
  USING (auth.uid() = user_id);

-- 3) updated_at Trigger
CREATE TRIGGER cases_touch_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Realtime-Publication
ALTER TABLE public.cases REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;

-- 5) plans erweitern
ALTER TABLE public.plans
  ADD COLUMN pipeline_config JSONB;

UPDATE public.plans
  SET pipeline_config = '{
    "type": "multi_stage",
    "stages": [
      { "name": "analysis", "provider": "anthropic", "model": "claude-sonnet-4-5" },
      { "name": "strategy", "provider": "openai",    "model": "gpt-5" },
      { "name": "draft",    "provider": "anthropic", "model": "claude-sonnet-4-5" }
    ]
  }'::jsonb
  WHERE id = 'elite';

UPDATE public.plans
  SET model_id = 'claude-sonnet-4-5'
  WHERE id = 'pro';