
ALTER TABLE public.plan_prices
  DROP CONSTRAINT IF EXISTS plan_prices_billing_cycle_check;

ALTER TABLE public.plan_prices
  ADD CONSTRAINT plan_prices_billing_cycle_check
  CHECK (billing_cycle IN ('monthly','yearly','one_time'));

-- 1. Free
UPDATE public.plans
   SET case_limit = 1, case_limit_type = 'monthly',
       tagline = 'Probier es kostenlos aus', updated_at = now()
 WHERE id = 'free';

-- 2. Pro
UPDATE public.plans
   SET case_limit = 20, refinements_per_month = 30,
       tagline = 'Für Selbständige, die regelmäßig verhandeln', updated_at = now()
 WHERE id = 'pro';

-- 3. Elite
UPDATE public.plans
   SET bookable_directly = false,
       tagline = 'Für Power-User & Teams – auf Anfrage', updated_at = now()
 WHERE id = 'elite';

-- 4. Single-Case-Pass
INSERT INTO public.plans (
  id, name, tier_key, tier_label, tagline, badge,
  model_id, case_limit, case_limit_type,
  sort_order, is_active, is_recommended, bookable_directly,
  initial_attachments_limit, refinement_attachments_limit,
  refinements_per_case, refinements_per_month,
  allows_tonality, allows_deep_doc_analysis, support_sla_hours
) VALUES (
  'single_case', 'Single Case', 'single_case', 'EINZELFALL',
  'Ein einziger Fall – ohne Abo', 'Einmalkauf',
  'claude-sonnet-4-5', 1, 'lifetime',
  15, true, false, true,
  10, 10, 3, NULL, true, false, 48
)
ON CONFLICT (id) DO UPDATE
  SET name=EXCLUDED.name, tagline=EXCLUDED.tagline, badge=EXCLUDED.badge,
      case_limit=EXCLUDED.case_limit, case_limit_type=EXCLUDED.case_limit_type,
      sort_order=EXCLUDED.sort_order, is_active=true, bookable_directly=true,
      updated_at = now();

-- 5. Pro-Jahrespreis
UPDATE public.plan_prices
   SET amount_cents = 49000, is_active = true, stripe_price_id = NULL
 WHERE plan_id = 'pro' AND billing_cycle = 'yearly' AND currency = 'EUR';

-- 6. Single-Case-Preis
INSERT INTO public.plan_prices (plan_id, billing_cycle, amount_cents, currency, is_active)
VALUES ('single_case', 'one_time', 2900, 'EUR', true)
ON CONFLICT (plan_id, billing_cycle, currency) DO UPDATE
  SET amount_cents = EXCLUDED.amount_cents, is_active = true;

-- 7. Features
DELETE FROM public.plan_features WHERE plan_id IN ('free','pro','elite','single_case');

INSERT INTO public.plan_features (plan_id, feature_text, is_highlight, sort_order) VALUES
  ('free', '1 voller Fall sofort – ohne Kreditkarte', true, 10),
  ('free', 'Danach 1 neuer Fall pro Monat', true, 20),
  ('free', 'Vollständige Analyse + fertiger Mail-Entwurf', false, 30),
  ('free', '3 Anhänge pro Fall', false, 40),
  ('free', 'Standard-Support · Antwort < 72h', false, 50),

  ('pro', '20 Fälle pro Monat', true, 10),
  ('pro', '30 intelligente Überarbeitungen pro Monat', true, 20),
  ('pro', 'Bis zu 10 Anhänge je Fall', false, 30),
  ('pro', 'Erweiterte Strategien (BATNA, Framing, mehrstufig)', false, 40),
  ('pro', 'Tonalitätsprofile (sachlich, diplomatisch, vertrieblich, juristisch)', false, 50),
  ('pro', 'Versionsverlauf & Wiederverwendung deiner besten Drafts', false, 60),
  ('pro', 'Jahresabo: 2 Monate gratis (€490/Jahr)', true, 70),
  ('pro', 'Priorisierter Support · SLA 12h', false, 80),

  ('elite', 'Alles aus Pro, plus:', true, 10),
  ('elite', '40 Fälle pro Monat', true, 20),
  ('elite', '60 Überarbeitungen pro Monat', false, 30),
  ('elite', 'Bis zu 25 Anhänge je Fall', false, 40),
  ('elite', 'Dokumentenübergreifende Tiefenanalyse', false, 50),
  ('elite', 'Premium-Modell (GPT-5) priorisiert', false, 60),
  ('elite', 'Früher Zugang zu neuen Strategiemodulen', false, 70),
  ('elite', 'VIP-Support · SLA < 6h', false, 80),
  ('elite', 'Buchbar nur nach kurzer Bedarfsklärung', false, 90),

  ('single_case', '1 vollständiger Verhandlungsfall', true, 10),
  ('single_case', 'Komplette Analyse + Mail-/Gesprächs-Entwurf', true, 20),
  ('single_case', '3 Überarbeitungsrunden inklusive', false, 30),
  ('single_case', 'Bis zu 10 Anhänge', false, 40),
  ('single_case', 'Kein Abo – einmal zahlen, dauerhaft nutzbar', true, 50),
  ('single_case', 'Ideal für Gehaltsgespräch, Vertragsstreit oder Kündigung', false, 60);
