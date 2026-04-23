-- Subscriptions table per Lovable Stripe webhook spec
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Map Stripe price_id (lookup_key) -> our plan_id + billing_cycle, then sync profile.
CREATE OR REPLACE FUNCTION public.sync_profile_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id text;
  v_cycle text;
  v_active boolean;
BEGIN
  -- Determine target subscription row (handle DELETE)
  IF TG_OP = 'DELETE' THEN
    -- On delete, downgrade to free
    UPDATE public.profiles
      SET plan_id = 'free',
          billing_cycle = NULL,
          subscription_status = 'canceled',
          updated_at = now()
      WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;

  -- Map price_id (lookup key) to our plan + cycle
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

  -- Treat 'active' and 'trialing' as entitled. canceled/incomplete/unpaid -> free.
  v_active := NEW.status IN ('active','trialing','past_due');

  IF v_active THEN
    UPDATE public.profiles
      SET plan_id = v_plan_id,
          billing_cycle = v_cycle,
          stripe_customer_id = COALESCE(NEW.stripe_customer_id, stripe_customer_id),
          subscription_status = NEW.status,
          -- Reset usage counter on a fresh upgrade (insert) only
          cases_used = CASE WHEN TG_OP = 'INSERT' AND v_plan_id <> 'free' THEN 0 ELSE cases_used END,
          updated_at = now()
      WHERE id = NEW.user_id;
  ELSE
    -- Canceled / incomplete -> downgrade to free
    UPDATE public.profiles
      SET plan_id = 'free',
          billing_cycle = NULL,
          subscription_status = NEW.status,
          updated_at = now()
      WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_sync_profile
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_from_subscription();