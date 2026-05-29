
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
    WHEN NEW.price_id IN ('pro_monthly','pro_yearly','pro_yearly_v2') THEN 'pro'
    WHEN NEW.price_id IN ('elite_monthly','elite_yearly') THEN 'elite'
    ELSE 'free'
  END;

  v_cycle := CASE
    WHEN NEW.price_id LIKE '%_monthly' THEN 'monthly'
    WHEN NEW.price_id LIKE '%_yearly%' THEN 'yearly'
    ELSE NULL
  END;

  v_active := NEW.status IN ('active','trialing','past_due');

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
