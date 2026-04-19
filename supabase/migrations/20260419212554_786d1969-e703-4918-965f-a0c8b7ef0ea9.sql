-- =========================================
-- STRATEGOS Pricing Schema
-- =========================================

CREATE TABLE public.plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  tier_label      TEXT NOT NULL,
  tagline         TEXT,
  badge           TEXT,
  model_id        TEXT NOT NULL,
  case_limit      INTEGER,
  case_limit_type TEXT NOT NULL DEFAULT 'unlimited',
  sort_order      INTEGER NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_recommended  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.plan_prices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  billing_cycle    TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  amount_cents     INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'EUR',
  stripe_price_id  TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, billing_cycle, currency)
);

CREATE TABLE public.plan_features (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_text   TEXT NOT NULL,
  sort_order     INTEGER NOT NULL,
  is_highlight   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_prices_plan_id ON public.plan_prices(plan_id);
CREATE INDEX idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX idx_plans_sort_order ON public.plans(sort_order) WHERE is_active = TRUE;

-- Trigger to auto-update updated_at on plans
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Plan prices are viewable by everyone"
  ON public.plan_prices FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Plan features are viewable by everyone"
  ON public.plan_features FOR SELECT
  USING (TRUE);

-- =========================================
-- Seed
-- =========================================

INSERT INTO public.plans (id, name, tier_label, tagline, badge, model_id, case_limit, case_limit_type, sort_order, is_recommended) VALUES
  ('free',  'Free',  'BASIS',    'Einstieg in das Sovereign-System',       NULL,        'google/gemini-2.5-flash-lite', 3,    'lifetime',  0, FALSE),
  ('pro',   'Pro',   'SOUVERÄN', 'Das Standard-Arsenal des Verhandlers',   'EMPFOHLEN', 'google/gemini-2.5-flash',      NULL, 'unlimited', 1, TRUE),
  ('elite', 'Elite', 'DIPLOMAT', 'Maximale Überlegenheit & Tiefenanalyse', NULL,        'openai/gpt-5',                 NULL, 'unlimited', 2, FALSE);

INSERT INTO public.plan_prices (plan_id, billing_cycle, amount_cents, currency) VALUES
  ('free',  'monthly',      0, 'EUR'),
  ('free',  'yearly',       0, 'EUR'),
  ('pro',   'monthly',   4900, 'EUR'),
  ('pro',   'yearly',   46800, 'EUR'),
  ('elite', 'monthly',  19900, 'EUR'),
  ('elite', 'yearly',  178800, 'EUR');

INSERT INTO public.plan_features (plan_id, feature_text, sort_order, is_highlight) VALUES
  ('free',  '3 Fallanalysen (einmalig, lebenslang)',                 0, TRUE),
  ('free',  'Basis-KI-Modell (Gemini Flash-Lite)',                   1, FALSE),
  ('free',  'Standard-Verhandlungsprotokolle',                       2, FALSE),
  ('free',  '7-Tage History',                                         3, FALSE),
  ('free',  'Community-Archiv (nur Lesezugriff)',                    4, FALSE),

  ('pro',   'Unlimitierte Fall-Analysen',                             0, TRUE),
  ('pro',   'KI-Strategie-Berater (Gemini 2.5 Flash)',                1, FALSE),
  ('pro',   'Alle taktischen Modelle (Voss, Harvard, Spieltheorie)',  2, FALSE),
  ('pro',   'Vollständige History, unbegrenzt',                       3, FALSE),
  ('pro',   'PDF- & XLS-Export',                                      4, FALSE),
  ('pro',   'Refinement Chat',                                        5, FALSE),
  ('pro',   'E-Mail Support',                                         6, FALSE),

  ('elite', 'Alles aus Pro, plus:',                                   0, TRUE),
  ('elite', 'GPT-5 Premium-Modell',                                   1, FALSE),
  ('elite', 'Dokumenten-Upload & -Analyse (PDF / DOCX)',              2, FALSE),
  ('elite', 'Deep-Psychology Gegenpartei-Profiling',                  3, FALSE),
  ('elite', 'Multi-User Dashboard (3 Seats)',                         4, FALSE),
  ('elite', '1-on-1 Onboarding',                                      5, FALSE),
  ('elite', 'Priority Support & API-Zugang',                          6, FALSE);