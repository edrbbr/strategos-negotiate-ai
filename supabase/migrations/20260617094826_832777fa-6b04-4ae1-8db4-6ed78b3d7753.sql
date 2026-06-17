
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS b2c_enabled boolean NOT NULL DEFAULT false;

-- Backfill: any existing profile that has no active business membership counts as B2C user.
UPDATE public.profiles p
SET b2c_enabled = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_users bu
  WHERE bu.auth_user_id = p.id AND bu.status = 'active'
);

-- Update handle_new_user to read signup_context from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, b2c_enabled)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'signup_context', 'b2c') = 'b2c'
  );
  RETURN NEW;
END;
$function$;

-- Self-service RPC to enable B2C for the calling user
CREATE OR REPLACE FUNCTION public.enable_b2c_for_self()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  UPDATE public.profiles SET b2c_enabled = true, updated_at = now() WHERE id = auth.uid();
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enable_b2c_for_self() TO authenticated;
