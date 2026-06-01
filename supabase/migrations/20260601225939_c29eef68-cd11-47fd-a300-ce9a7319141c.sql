
-- 1. Set fixed search_path on our own SECURITY DEFINER pgmq wrapper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2. Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions.
-- All of these are invoked from edge functions using the service role key,
-- or used internally inside RLS policies / triggers where caller EXECUTE
-- privileges are not required.
REVOKE EXECUTE ON FUNCTION public.consume_dossier(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_refinement(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_discount_code(uuid, text, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_knowledge(vector, integer, text[]) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
-- has_role kept for authenticated since it may be invoked from authenticated SQL contexts;
-- inside RLS policies it works regardless because policies run with their own privileges.

-- Ensure service_role retains access
GRANT EXECUTE ON FUNCTION public.consume_dossier(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_refinement(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector, integer, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
