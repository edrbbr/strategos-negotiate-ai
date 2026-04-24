-- Add theme preference column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference text
  CHECK (theme_preference IN ('light','dark'));

-- Allow users to update their own theme_preference
-- The existing UPDATE policy locks down sensitive columns (plan_id, cases_used,
-- stripe_customer_id, subscription_status) but allows other columns including
-- theme_preference, so no policy change is required.