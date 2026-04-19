-- Profiles table extending auth.users
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  organization          TEXT,
  avatar_url            TEXT,
  plan_id               TEXT NOT NULL DEFAULT 'free' REFERENCES public.plans(id),
  billing_cycle         TEXT CHECK (billing_cycle IN ('monthly','yearly')),
  stripe_customer_id    TEXT,
  subscription_status   TEXT DEFAULT 'active' CHECK (subscription_status IN ('active','past_due','canceled','trialing')),
  cases_used            INTEGER NOT NULL DEFAULT 0,
  aggressive_mode       BOOLEAN NOT NULL DEFAULT FALSE,
  archive_mode          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_plan_id ON public.profiles(plan_id);
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND plan_id = (SELECT plan_id FROM public.profiles WHERE id = auth.uid())
    AND cases_used = (SELECT cases_used FROM public.profiles WHERE id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM public.profiles WHERE id = auth.uid())
    AND subscription_status = (SELECT subscription_status FROM public.profiles WHERE id = auth.uid())
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at touch
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC for the router
CREATE OR REPLACE FUNCTION public.increment_cases_used(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE public.profiles
    SET cases_used = cases_used + 1
    WHERE id = p_user_id
    RETURNING cases_used INTO v_new_count;
  RETURN v_new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_cases_used(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_cases_used(UUID) FROM anon, authenticated;