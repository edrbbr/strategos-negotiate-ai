-- =========================================================================
-- 1) PLANS: Tier-Felder & Limits
-- =========================================================================
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS tier_key text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS initial_attachments_limit integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS refinement_attachments_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refinements_per_case integer,
  ADD COLUMN IF NOT EXISTS refinements_per_month integer,
  ADD COLUMN IF NOT EXISTS allows_tonality boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allows_deep_doc_analysis boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS support_sla_hours integer,
  ADD COLUMN IF NOT EXISTS bookable_directly boolean NOT NULL DEFAULT true;

-- Backfill tier_key from id (id values are already free/pro/elite)
UPDATE public.plans SET tier_key = id WHERE tier_key IS NULL OR tier_key = 'free';

-- =========================================================================
-- 2) PLAN_FEATURES: optionaler Hilfetext (Tooltip/Popover)
-- =========================================================================
ALTER TABLE public.plan_features
  ADD COLUMN IF NOT EXISTS help_text text;

-- =========================================================================
-- 3) NEGOTIATION_STRATEGIES: tierbasierte Filterung
-- =========================================================================
ALTER TABLE public.negotiation_strategies
  ADD COLUMN IF NOT EXISTS min_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS prompt_hint text;

-- Strategien neu aufsetzen (saubere Liste statt Migration alter Daten)
DELETE FROM public.negotiation_strategies;

INSERT INTO public.negotiation_strategies (key, label, description, min_tier, sort_order, prompt_hint, is_active) VALUES
-- FREE
('sachorientiert', 'Sachorientierte Verhandlung', 'Fokus auf Interessen, Ziele, Optionen und sachliche Argumentation.', 'free', 10, 'Argue strictly on interests, goals, objective options. Avoid positional bargaining.', true),
('anker_zielkorridor', 'Anker- und Zielkorridor', 'Klare Einstiegsposition, Zielwert und Untergrenze definieren.', 'free', 20, 'Define entry anchor, target value, walk-away threshold explicitly in the draft.', true),
('einwand_basis', 'Einwandbehandlung Basis', 'Standardreaktionen auf typische Gegenargumente.', 'free', 30, 'Pre-empt typical objections with calm, factual rebuttals.', true),
('ton_eskalation_basis', 'Ton- und Eskalationssteuerung Basis', 'Sachlich, bestimmt, deeskalierend.', 'free', 40, 'Maintain factual, firm, de-escalating tone throughout.', true),
('brief_email_basis', 'Brief/E-Mail Basis-Optimierung', 'Klarheit, Struktur, professioneller Ton.', 'free', 50, 'Optimize for clarity, structure, professional tone.', true),
-- PRO
('batna', 'BATNA / Alternativenbewertung', 'Bessere Verhandlungsposition durch Bewertung realistischer Alternativen.', 'pro', 60, 'Reference the user''s BATNA implicitly to strengthen leverage without revealing it.', true),
('zugestaendnis_logik', 'Zugeständnis- und Gegenforderungslogik', 'Was, wann, in welcher Reihenfolge nachgeben — gegen welche Gegenforderung.', 'pro', 70, 'Structure concessions sequentially, each tied to a counter-demand.', true),
('mehrstufig', 'Mehrstufige Antwortstrategie', 'Freundlich, bestimmt, hartnäckig, letzte Eskalationsstufe.', 'pro', 80, 'Layer the response: friendly opener, firm core, persistent close, latent escalation cue.', true),
('stakeholder_light', 'Stakeholder-/Machtpositions-Analyse light', 'Wer entscheidet, wer beeinflusst, wer blockiert.', 'pro', 90, 'Identify decision-maker vs. influencer vs. gatekeeper and address accordingly.', true),
('framing_reframing', 'Framing- und Reframing-Vorschläge', 'Sachverhalt kommunikativ günstiger darstellen.', 'pro', 100, 'Reframe contested points to favourable framing without distorting facts.', true),
('high_stakes_textmuster', 'High-Stakes-Textmuster', 'Stärkere Formulierungen für schwierige Fälle.', 'pro', 110, 'Use high-stakes phrasing patterns: precise demands, binding deadlines, escalation hooks.', true),
-- ELITE
('mehrszenario', 'Mehrszenario-Strategien', 'Wenn Gegenseite A sagt, dann Route 1; wenn B, dann Route 2.', 'elite', 120, 'Provide branching responses (If counterparty replies A → route 1, B → route 2).', true),
('gegenueber_profiling', 'Psychologisches Gegenüber-Profiling', 'Kommunikativer Stil, Druckpunkte, zu erwartende Reaktionen.', 'elite', 130, 'Profile counterparty style, pressure points, predict likely reactions.', true),
('eskalations_architektur', 'Dynamische Eskalationsarchitektur', 'Von kooperativ bis ultimativ, mit Übergangslogik.', 'elite', 140, 'Lay out a multi-tier escalation architecture with explicit transition triggers.', true),
('deadlock_aufloesung', 'Deadlock-/Blockade-Auflösung', 'Strategien für festgefahrene Verhandlungen.', 'elite', 150, 'Provide deadlock-breaking moves: bridging offers, frame shifts, third-party leverage.', true),
('multi_party', 'Multi-Party-Strategie', 'Mehrere Beteiligte oder interne Entscheider parallel adressieren.', 'elite', 160, 'Address multiple parties / internal decision-makers in parallel with tailored angles.', true),
('dokumenten_tiefenanalyse', 'Dokumentenübergreifende Tiefenanalyse', 'Mehrere Anhänge zusammen auswerten und vernetzen.', 'elite', 170, 'Cross-link evidence across all attachments; surface contradictions and corroborations.', true),
('priorisierte_route', 'Priorisierte Strategieauswahl', 'Begründete Priorisierung, warum genau diese Route im Einzelfall optimal ist.', 'elite', 180, 'Justify the chosen route with explicit ranking against discarded alternatives.', true);

-- =========================================================================
-- 4) TONALITY_PROFILES (neu)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tonality_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  prompt_instruction text NOT NULL,
  min_tier text NOT NULL DEFAULT 'pro',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tonality_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tonality profiles viewable by everyone"
  ON public.tonality_profiles FOR SELECT
  USING (is_active = true);

INSERT INTO public.tonality_profiles (key, label, description, prompt_instruction, min_tier, sort_order) VALUES
('standard', 'Standard', 'Professionell, sachlich, sicher.', 'Use a professional, neutral, confident tone — the default sovereign STRATEGOS register.', 'pro', 10),
('diplomatisch_bestimmt', 'Diplomatisch bestimmt', 'Höflich verbindlich, klar in der Sache, weich im Ton.', 'Use a diplomatically firm tone: courteous and binding in form, unambiguous in substance, soft in delivery. Preserve face for the counterparty while leaving no escape on the matter.', 'pro', 20),
('juristisch_nuechtern', 'Juristisch-nüchtern', 'Präzise, formal, paragraphenartig — geeignet für rechtliche Kontexte.', 'Use a legally precise, formal, clause-style tone. Reference obligations, deadlines, and consequences in an objective, paragraph-like cadence. Avoid emotional language.', 'pro', 30),
('verkaufsorientiert', 'Verkaufsorientiert', 'Nutzenorientiert, beziehungsstark, abschlussfokussiert.', 'Use a sales-oriented tone: lead with value and benefits, build rapport, anchor the close. Confident, warm, action-oriented language.', 'pro', 40);

-- =========================================================================
-- 5) CASES: gewähltes Tonalitätsprofil
-- =========================================================================
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS tonality_profile_key text NOT NULL DEFAULT 'standard';

-- =========================================================================
-- 6) DISCOUNT_CODES (neu) + Redemptions
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  percent_off integer,
  amount_off_cents integer,
  currency text NOT NULL DEFAULT 'EUR',
  duration text NOT NULL DEFAULT 'once',  -- once | forever | repeating
  duration_in_months integer,
  applicable_plan_ids text[] NOT NULL DEFAULT '{}'::text[], -- empty = all
  applicable_billing_cycles text[] NOT NULL DEFAULT '{}'::text[], -- empty = all
  stripe_coupon_id_sandbox text,
  stripe_coupon_id_live text,
  max_redemptions_per_user integer NOT NULL DEFAULT 1,
  max_total_redemptions integer,
  total_redemptions integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages discount codes"
  ON public.discount_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins view discount codes"
  ON public.discount_codes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  stripe_session_id text,
  stripe_subscription_id text,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, discount_code_id)
);

ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.discount_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages redemptions"
  ON public.discount_redemptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_user ON public.discount_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code_active ON public.discount_codes(code) WHERE is_active = true;

-- =========================================================================
-- 7) UPGRADE_PREVIEWS (neu) — serverseitig truncierte Pro-Vorschauen
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.upgrade_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid NOT NULL,
  pro_strategy text,
  pro_strategy_label text,
  pro_first_paragraph text,
  pro_extra_insight text,
  free_strategy_snapshot text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  UNIQUE (case_id)
);

ALTER TABLE public.upgrade_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own previews"
  ON public.upgrade_previews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own previews viewed"
  ON public.upgrade_previews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages previews"
  ON public.upgrade_previews FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_upgrade_previews_user ON public.upgrade_previews(user_id);

-- =========================================================================
-- 8) REFINEMENT TRACKING — monatliches Limit
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS refinements_used_period integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refinements_period_start timestamptz;

CREATE OR REPLACE FUNCTION public.consume_refinement(p_user_id uuid, p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_per_case integer;
  v_per_month integer;
  v_used_period integer;
  v_period_start timestamptz;
  v_case_refinements integer;
  v_now timestamptz := now();
  v_period_changed boolean := false;
BEGIN
  SELECT pl.tier_key, pl.refinements_per_case, pl.refinements_per_month,
         p.refinements_used_period, p.refinements_period_start
    INTO v_tier, v_per_case, v_per_month, v_used_period, v_period_start
    FROM public.profiles p
    JOIN public.plans pl ON pl.id = p.plan_id
    WHERE p.id = p_user_id
    FOR UPDATE OF p;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found');
  END IF;

  -- Roll monthly window if needed
  IF v_period_start IS NULL OR v_period_start < (v_now - interval '30 days') THEN
    v_used_period := 0;
    v_period_start := v_now;
    v_period_changed := true;
  END IF;

  -- Per-case limit (Free: 3 per case)
  IF v_per_case IS NOT NULL THEN
    SELECT count(*) INTO v_case_refinements
      FROM public.case_versions
      WHERE case_id = p_case_id AND kind = 'refinement';
    IF v_case_refinements >= v_per_case THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'per_case_limit',
        'limit', v_per_case,
        'used_for_case', v_case_refinements,
        'tier', v_tier
      );
    END IF;
  END IF;

  -- Per-month limit (Pro: 20, Elite: 60)
  IF v_per_month IS NOT NULL AND v_used_period >= v_per_month THEN
    -- Elite gets soft warning rather than hard block
    IF v_tier = 'elite' THEN
      UPDATE public.profiles
        SET refinements_used_period = v_used_period + 1,
            refinements_period_start = v_period_start,
            updated_at = v_now
        WHERE id = p_user_id;
      RETURN jsonb_build_object(
        'allowed', true,
        'soft_warning', true,
        'message', 'Above standard monthly volume — please reach out to support if continued at scale.',
        'used_period', v_used_period + 1,
        'limit', v_per_month,
        'tier', v_tier
      );
    END IF;
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'per_month_limit',
      'limit', v_per_month,
      'used_period', v_used_period,
      'tier', v_tier
    );
  END IF;

  -- Consume
  UPDATE public.profiles
    SET refinements_used_period = v_used_period + 1,
        refinements_period_start = v_period_start,
        updated_at = v_now
    WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'used_period', v_used_period + 1,
    'period_start', v_period_start,
    'period_reset', v_period_changed,
    'limit', v_per_month,
    'tier', v_tier
  );
END;
$$;

-- =========================================================================
-- 9) DISCOUNT VALIDATION RPC
-- =========================================================================
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_user_id uuid,
  p_code text,
  p_plan_id text,
  p_billing_cycle text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dc public.discount_codes%ROWTYPE;
  v_already_redeemed integer;
BEGIN
  SELECT * INTO v_dc
    FROM public.discount_codes
    WHERE upper(code) = upper(trim(p_code))
      AND is_active = true
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_dc.valid_from IS NOT NULL AND now() < v_dc.valid_from THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_yet_valid');
  END IF;
  IF v_dc.valid_until IS NOT NULL AND now() > v_dc.valid_until THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF v_dc.max_total_redemptions IS NOT NULL AND v_dc.total_redemptions >= v_dc.max_total_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'global_limit_reached');
  END IF;

  IF array_length(v_dc.applicable_plan_ids, 1) IS NOT NULL
     AND NOT (p_plan_id = ANY (v_dc.applicable_plan_ids)) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'plan_not_applicable');
  END IF;
  IF array_length(v_dc.applicable_billing_cycles, 1) IS NOT NULL
     AND NOT (p_billing_cycle = ANY (v_dc.applicable_billing_cycles)) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'cycle_not_applicable');
  END IF;

  SELECT count(*) INTO v_already_redeemed
    FROM public.discount_redemptions
    WHERE user_id = p_user_id AND discount_code_id = v_dc.id;
  IF v_already_redeemed >= v_dc.max_redemptions_per_user THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_redeemed');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code_id', v_dc.id,
    'code', v_dc.code,
    'percent_off', v_dc.percent_off,
    'amount_off_cents', v_dc.amount_off_cents,
    'currency', v_dc.currency,
    'duration', v_dc.duration,
    'duration_in_months', v_dc.duration_in_months,
    'stripe_coupon_id_sandbox', v_dc.stripe_coupon_id_sandbox,
    'stripe_coupon_id_live', v_dc.stripe_coupon_id_live
  );
END;
$$;

-- =========================================================================
-- 10) Update plan defaults with new limit values
-- =========================================================================
UPDATE public.plans SET
  tier_key = 'free',
  initial_attachments_limit = 3,
  refinement_attachments_limit = 0,
  refinements_per_case = 3,
  refinements_per_month = NULL,
  allows_tonality = false,
  allows_deep_doc_analysis = false,
  support_sla_hours = 72,
  bookable_directly = true,
  case_limit = 3,
  case_limit_type = 'total'
WHERE id = 'free';

UPDATE public.plans SET
  tier_key = 'pro',
  initial_attachments_limit = 10,
  refinement_attachments_limit = 10,
  refinements_per_case = NULL,
  refinements_per_month = 20,
  allows_tonality = true,
  allows_deep_doc_analysis = false,
  support_sla_hours = 12,
  bookable_directly = true,
  case_limit = 15,
  case_limit_type = 'monthly'
WHERE id = 'pro';

UPDATE public.plans SET
  tier_key = 'elite',
  initial_attachments_limit = 25,
  refinement_attachments_limit = 25,
  refinements_per_case = NULL,
  refinements_per_month = 60,
  allows_tonality = true,
  allows_deep_doc_analysis = true,
  support_sla_hours = 6,
  bookable_directly = false,
  case_limit = 40,
  case_limit_type = 'monthly'
WHERE id = 'elite';

-- =========================================================================
-- 11) plans_public View neu aufbauen (mit allen neuen Feldern)
-- =========================================================================
DROP VIEW IF EXISTS public.plans_public CASCADE;

CREATE VIEW public.plans_public AS
SELECT
  id,
  name,
  tagline,
  tier_label,
  tier_key,
  badge,
  case_limit,
  case_limit_type,
  initial_attachments_limit,
  refinement_attachments_limit,
  refinements_per_case,
  refinements_per_month,
  allows_tonality,
  allows_deep_doc_analysis,
  support_sla_hours,
  bookable_directly,
  is_recommended,
  is_active,
  sort_order,
  created_at,
  updated_at
FROM public.plans
WHERE is_active = true;

GRANT SELECT ON public.plans_public TO anon, authenticated;