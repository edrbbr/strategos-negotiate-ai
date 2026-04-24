-- Fix 1: plans_public als security_invoker view neu aufsetzen
DROP VIEW IF EXISTS public.plans_public CASCADE;

CREATE VIEW public.plans_public
WITH (security_invoker = true)
AS
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

-- Fix 2: consume_refinement search_path explizit pinnen
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

  IF v_period_start IS NULL OR v_period_start < (v_now - interval '30 days') THEN
    v_used_period := 0;
    v_period_start := v_now;
    v_period_changed := true;
  END IF;

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

  IF v_per_month IS NOT NULL AND v_used_period >= v_per_month THEN
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

-- Fix 3: validate_discount_code search_path explizit pinnen
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