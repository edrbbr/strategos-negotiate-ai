
-- =========================================
-- 1. PRO-PLAN auf 20 Dossiers pro Monat
-- =========================================
UPDATE public.plans
SET case_limit = 20,
    case_limit_type = 'monthly',
    updated_at = now()
WHERE id = 'pro';

-- Alte „unbegrenzt"-Features für Pro entfernen, neue ergänzen
DELETE FROM public.plan_features
WHERE plan_id = 'pro'
  AND (
    feature_text ILIKE '%unbegrenzt%' 
    OR feature_text ILIKE '%unlimited%'
    OR feature_text ILIKE '%unlimitiert%'
  );

INSERT INTO public.plan_features (plan_id, feature_text, sort_order, is_highlight)
VALUES
  ('pro', '20 Dossiers pro Monat', 1, true),
  ('pro', 'Zusatz-Dossiers à 10 € nachkaufbar', 2, false);

-- =========================================
-- 2. PROFILES: extra_credits + period_start
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS extra_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cases_period_start timestamptz;

-- =========================================
-- 3. EXTRA_CREDIT_PURCHASES Tabelle
-- =========================================
CREATE TABLE IF NOT EXISTS public.extra_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  stripe_session_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extra_credit_purchases_user_id 
  ON public.extra_credit_purchases(user_id);

ALTER TABLE public.extra_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own extra credit purchases"
  ON public.extra_credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages extra credit purchases"
  ON public.extra_credit_purchases FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_extra_credit_purchases_updated_at
  BEFORE UPDATE ON public.extra_credit_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 4. USER ROLES SYSTEM
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (SECURITY DEFINER, kein Rekursions-Problem)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 5. ELITE_REQUESTS Tabelle
-- =========================================
CREATE TABLE IF NOT EXISTS public.elite_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  profession text NOT NULL,
  primary_use_case text NOT NULL,
  monthly_negotiation_volume text NOT NULL,
  biggest_pain_point text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_token uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elite_requests_user_id ON public.elite_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_elite_requests_status ON public.elite_requests(status);

ALTER TABLE public.elite_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own elite requests"
  ON public.elite_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own elite requests"
  ON public.elite_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all elite requests"
  ON public.elite_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update elite requests"
  ON public.elite_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_elite_requests_updated_at
  BEFORE UPDATE ON public.elite_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 6. consume_dossier RPC
--   - Free: hartes Limit (case_limit aus plan, kein Extra-Credit-Erwerb)
--   - Pro: zieht zuerst aus cases_used bis case_limit, danach aus extra_credits
--   - Elite (case_limit IS NULL): unbegrenzt
-- =========================================
CREATE OR REPLACE FUNCTION public.consume_dossier(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id text;
  v_case_limit integer;
  v_cases_used integer;
  v_extra_credits integer;
  v_can_purchase boolean;
BEGIN
  -- Profil + Plan-Limit holen (gemeinsam für Konsistenz)
  SELECT p.plan_id, pl.case_limit, p.cases_used, p.extra_credits
    INTO v_plan_id, v_case_limit, v_cases_used, v_extra_credits
    FROM public.profiles p
    JOIN public.plans pl ON pl.id = p.plan_id
    WHERE p.id = p_user_id
    FOR UPDATE OF p;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_not_found', 'purchasable', false);
  END IF;

  -- Elite (oder andere unlimited): einfach hochzählen
  IF v_case_limit IS NULL THEN
    UPDATE public.profiles SET cases_used = cases_used + 1, updated_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining_quota', NULL,
      'remaining_extra', v_extra_credits,
      'unlimited', true
    );
  END IF;

  v_can_purchase := (v_plan_id = 'pro');

  -- Genug Monats-Kontingent? -> aus cases_used ziehen
  IF v_cases_used < v_case_limit THEN
    UPDATE public.profiles SET cases_used = cases_used + 1, updated_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining_quota', v_case_limit - (v_cases_used + 1),
      'remaining_extra', v_extra_credits,
      'unlimited', false
    );
  END IF;

  -- Kontingent erschöpft, Extra-Credits verfügbar?
  IF v_extra_credits > 0 THEN
    UPDATE public.profiles 
      SET extra_credits = extra_credits - 1, 
          cases_used = cases_used + 1,
          updated_at = now() 
      WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining_quota', 0,
      'remaining_extra', v_extra_credits - 1,
      'unlimited', false,
      'consumed_extra', true
    );
  END IF;

  -- Verbraucht & nichts da
  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'quota_exhausted',
    'purchasable', v_can_purchase,
    'remaining_quota', 0,
    'remaining_extra', 0
  );
END;
$$;

-- =========================================
-- 7. sync_profile_from_subscription erweitern:
--    Bei Periodenwechsel cases_used zurücksetzen, Extra-Credits verfallen
-- =========================================
CREATE OR REPLACE FUNCTION public.sync_profile_from_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id text;
  v_cycle text;
  v_active boolean;
  v_old_period_start timestamptz;
  v_period_changed boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
      SET plan_id = 'free',
          billing_cycle = NULL,
          subscription_status = 'canceled',
          extra_credits = 0,
          updated_at = now()
      WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;

  v_plan_id := CASE
    WHEN NEW.price_id IN ('pro_monthly','pro_yearly') THEN 'pro'
    WHEN NEW.price_id IN ('elite_monthly','elite_yearly') THEN 'elite'
    ELSE 'free'
  END;

  v_cycle := CASE
    WHEN NEW.price_id LIKE '%_monthly' THEN 'monthly'
    WHEN NEW.price_id LIKE '%_yearly' THEN 'yearly'
    ELSE NULL
  END;

  v_active := NEW.status IN ('active','trialing','past_due');

  -- Periodenwechsel erkennen (UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.current_period_start IS DISTINCT FROM NEW.current_period_start THEN
    v_period_changed := true;
  END IF;

  IF v_active THEN
    UPDATE public.profiles
      SET plan_id = v_plan_id,
          billing_cycle = v_cycle,
          stripe_customer_id = COALESCE(NEW.stripe_customer_id, stripe_customer_id),
          subscription_status = NEW.status,
          cases_used = CASE 
            WHEN TG_OP = 'INSERT' AND v_plan_id <> 'free' THEN 0
            WHEN v_period_changed THEN 0
            ELSE cases_used 
          END,
          extra_credits = CASE
            WHEN TG_OP = 'INSERT' AND v_plan_id <> 'free' THEN 0
            WHEN v_period_changed THEN 0
            ELSE extra_credits
          END,
          cases_period_start = CASE
            WHEN TG_OP = 'INSERT' OR v_period_changed THEN COALESCE(NEW.current_period_start, now())
            ELSE cases_period_start
          END,
          updated_at = now()
      WHERE id = NEW.user_id;
  ELSE
    UPDATE public.profiles
      SET plan_id = 'free',
          billing_cycle = NULL,
          subscription_status = NEW.status,
          extra_credits = 0,
          updated_at = now()
      WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;
