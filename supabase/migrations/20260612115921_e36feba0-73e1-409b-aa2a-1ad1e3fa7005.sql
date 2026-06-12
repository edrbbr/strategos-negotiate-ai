
REVOKE SELECT ON public.industries FROM anon, authenticated;
GRANT SELECT (key, label, is_active, created_at, updated_at) ON public.industries TO anon, authenticated;
GRANT ALL ON public.industries TO service_role;

REVOKE SELECT ON public.linkedin_templates FROM anon, authenticated;
GRANT SELECT (id, key, label, description, sort_order, is_active, created_at) ON public.linkedin_templates TO authenticated;
GRANT ALL ON public.linkedin_templates TO service_role;

REVOKE SELECT ON public.negotiation_strategies FROM anon, authenticated;
GRANT SELECT (id, key, label, description, min_tier, is_active, sort_order, created_at) ON public.negotiation_strategies TO anon, authenticated;
GRANT ALL ON public.negotiation_strategies TO service_role;
