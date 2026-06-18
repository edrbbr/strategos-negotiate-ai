
-- 1) Fix Security Definer View
ALTER VIEW public.linkedin_pool_public SET (security_invoker = true);

-- 2) Migrate role_admin_user_ids from business_users.id -> auth_user_id
UPDATE public.business_settings bs
SET role_admin_user_ids = COALESCE((
  SELECT array_agg(DISTINCT bu.auth_user_id)
  FROM public.business_users bu
  WHERE bu.id = ANY(bs.role_admin_user_ids)
    AND bu.auth_user_id IS NOT NULL
), '{}'::uuid[])
WHERE role_admin_user_ids IS NOT NULL
  AND array_length(role_admin_user_ids, 1) > 0;

-- 3) Refactor can_manage_roles to use auth_user_id directly
CREATE OR REPLACE FUNCTION public.can_manage_roles(_user uuid, _account uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.auth_user_id = _user
      AND bu.business_account_id = _account
      AND bu.status = 'active'
      AND (
        bu.role = 'leitung'
        OR _user = ANY (
          COALESCE((SELECT role_admin_user_ids FROM public.business_settings WHERE business_account_id = _account), '{}'::uuid[])
        )
      )
  )
$function$;
