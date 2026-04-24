-- Grant SELECT on plans + related tables/view to anon and authenticated.
-- RLS policies remain authoritative (already restrict by is_active=true).
-- Without GRANT SELECT, PostgREST returns 42501 even when RLS would allow.

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.plans_public TO anon, authenticated;
GRANT SELECT ON public.plan_prices TO anon, authenticated;
GRANT SELECT ON public.plan_features TO anon, authenticated;
GRANT SELECT ON public.negotiation_strategies TO anon, authenticated;
GRANT SELECT ON public.tonality_profiles TO anon, authenticated;