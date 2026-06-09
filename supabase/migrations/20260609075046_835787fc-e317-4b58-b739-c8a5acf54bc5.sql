
-- 1. Extend business_custom_roles
ALTER TABLE public.business_custom_roles
  ADD COLUMN IF NOT EXISTS rank int,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_builtin boolean NOT NULL DEFAULT false;

-- Backfill rank for any existing rows (use 100 + row_number * 10 to avoid clashes; will be re-numbered below)
UPDATE public.business_custom_roles SET rank = 100 + (extract(epoch from created_at)::int % 1000) WHERE rank IS NULL;

-- 2. Extend business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS role_admin_user_ids uuid[] NOT NULL DEFAULT '{}';

-- 3. Seed built-in roles for every existing business_account
INSERT INTO public.business_custom_roles (business_account_id, role_key, label, max_discount_percent, base_role, rank, is_builtin, is_active)
SELECT ba.id, 'sachbearbeiter', 'Sachbearbeiter:in', 10, 'sachbearbeiter', 10, true, true
  FROM public.business_accounts ba
  WHERE NOT EXISTS (SELECT 1 FROM public.business_custom_roles r WHERE r.business_account_id = ba.id AND r.role_key = 'sachbearbeiter');

INSERT INTO public.business_custom_roles (business_account_id, role_key, label, max_discount_percent, base_role, rank, is_builtin, is_active)
SELECT ba.id, 'manager', 'Manager:in', 25, 'manager', 20, true, true
  FROM public.business_accounts ba
  WHERE NOT EXISTS (SELECT 1 FROM public.business_custom_roles r WHERE r.business_account_id = ba.id AND r.role_key = 'manager');

INSERT INTO public.business_custom_roles (business_account_id, role_key, label, max_discount_percent, base_role, rank, is_builtin, is_active)
SELECT ba.id, 'leitung', 'Leitung', 100, 'leitung', 30, true, true
  FROM public.business_accounts ba
  WHERE NOT EXISTS (SELECT 1 FROM public.business_custom_roles r WHERE r.business_account_id = ba.id AND r.role_key = 'leitung');

-- Re-normalize ranks per account to 10/20/30/... ascending by current rank
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY business_account_id ORDER BY rank, created_at) * 10 AS new_rank
  FROM public.business_custom_roles
)
UPDATE public.business_custom_roles r SET rank = o.new_rank FROM ordered o WHERE o.id = r.id;

ALTER TABLE public.business_custom_roles ALTER COLUMN rank SET NOT NULL;

-- Unique constraint, deferrable for batch re-order
ALTER TABLE public.business_custom_roles
  DROP CONSTRAINT IF EXISTS business_custom_roles_account_rank_unique;
ALTER TABLE public.business_custom_roles
  ADD CONSTRAINT business_custom_roles_account_rank_unique
  UNIQUE (business_account_id, rank) DEFERRABLE INITIALLY IMMEDIATE;

-- 4. Trigger: protect Leitung row + enforce limit monotonicity
CREATE OR REPLACE FUNCTION public.business_custom_roles_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_below numeric;
  v_above numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_builtin AND OLD.base_role = 'leitung' THEN
      RAISE EXCEPTION 'leitung_role_cannot_be_deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_builtin AND OLD.base_role = 'leitung' THEN
    IF NEW.is_active = false THEN
      RAISE EXCEPTION 'leitung_role_cannot_be_deactivated';
    END IF;
    IF NEW.is_builtin = false THEN
      RAISE EXCEPTION 'leitung_role_must_remain_builtin';
    END IF;
  END IF;

  -- Monotonicity: max_discount_percent must be >= every active role with lower rank
  SELECT max(max_discount_percent) INTO v_below
    FROM public.business_custom_roles
    WHERE business_account_id = NEW.business_account_id
      AND id <> NEW.id
      AND is_active = true
      AND rank < NEW.rank;
  IF v_below IS NOT NULL AND NEW.max_discount_percent < v_below THEN
    RAISE EXCEPTION 'rank_limit_below_subordinate' USING DETAIL = format('Untergeordnete Rolle hat %% Limit.', v_below);
  END IF;

  -- and <= every active role with higher rank
  SELECT min(max_discount_percent) INTO v_above
    FROM public.business_custom_roles
    WHERE business_account_id = NEW.business_account_id
      AND id <> NEW.id
      AND is_active = true
      AND rank > NEW.rank;
  IF v_above IS NOT NULL AND NEW.max_discount_percent > v_above THEN
    RAISE EXCEPTION 'rank_limit_above_superior' USING DETAIL = format('Übergeordnete Rolle hat %% Limit.', v_above);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_custom_roles_guard_trg ON public.business_custom_roles;
CREATE TRIGGER business_custom_roles_guard_trg
BEFORE UPDATE OR DELETE ON public.business_custom_roles
FOR EACH ROW EXECUTE FUNCTION public.business_custom_roles_guard();

DROP TRIGGER IF EXISTS business_custom_roles_guard_ins_trg ON public.business_custom_roles;
CREATE TRIGGER business_custom_roles_guard_ins_trg
BEFORE INSERT ON public.business_custom_roles
FOR EACH ROW EXECUTE FUNCTION public.business_custom_roles_guard();

-- 5. Update seeding trigger for new accounts
CREATE OR REPLACE FUNCTION public.create_default_business_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_settings (business_account_id)
  VALUES (NEW.id)
  ON CONFLICT (business_account_id) DO NOTHING;

  INSERT INTO public.business_custom_roles (business_account_id, role_key, label, max_discount_percent, base_role, rank, is_builtin, is_active)
  VALUES
    (NEW.id, 'sachbearbeiter', 'Sachbearbeiter:in', 10, 'sachbearbeiter', 10, true, true),
    (NEW.id, 'manager', 'Manager:in', 25, 'manager', 20, true, true),
    (NEW.id, 'leitung', 'Leitung', 100, 'leitung', 30, true, true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6. can_manage_roles helper
CREATE OR REPLACE FUNCTION public.can_manage_roles(_user uuid, _account uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.auth_user_id = _user
      AND bu.business_account_id = _account
      AND bu.status = 'active'
      AND (
        bu.role = 'leitung'
        OR bu.id = ANY (
          COALESCE((SELECT role_admin_user_ids FROM public.business_settings WHERE business_account_id = _account), '{}'::uuid[])
        )
      )
  )
$$;

-- 7. RLS for business_custom_roles: drop manage-all, allow only can_manage_roles
DROP POLICY IF EXISTS "Members read custom roles" ON public.business_custom_roles;
DROP POLICY IF EXISTS "Managers manage custom roles" ON public.business_custom_roles;
DROP POLICY IF EXISTS "Leitung manage custom roles" ON public.business_custom_roles;
DROP POLICY IF EXISTS "Role admins manage custom roles" ON public.business_custom_roles;

CREATE POLICY "Members read custom roles" ON public.business_custom_roles
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_account_id));

CREATE POLICY "Role admins manage custom roles" ON public.business_custom_roles
  FOR ALL TO authenticated
  USING (public.can_manage_roles(auth.uid(), business_account_id))
  WITH CHECK (public.can_manage_roles(auth.uid(), business_account_id));

-- 8. effective_discount_limit: use custom_roles table for built-ins too
CREATE OR REPLACE FUNCTION public.effective_discount_limit(_user uuid, _account uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_custom_key text;
  v_limit numeric;
BEGIN
  SELECT role, custom_role_key INTO v_role, v_custom_key
    FROM public.business_users
    WHERE auth_user_id = _user AND business_account_id = _account AND status = 'active'
    LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_custom_key IS NOT NULL THEN
    SELECT max_discount_percent INTO v_limit
      FROM public.business_custom_roles
      WHERE business_account_id = _account AND role_key = v_custom_key AND is_active = true
      LIMIT 1;
    IF FOUND THEN RETURN v_limit; END IF;
  END IF;

  -- Match built-in by base_role + is_builtin
  SELECT max_discount_percent INTO v_limit
    FROM public.business_custom_roles
    WHERE business_account_id = _account AND is_builtin = true AND base_role = v_role AND is_active = true
    LIMIT 1;
  IF FOUND THEN RETURN v_limit; END IF;

  -- fallback
  RETURN CASE v_role
    WHEN 'leitung' THEN 100
    WHEN 'manager' THEN 25
    WHEN 'sachbearbeiter' THEN 10
    ELSE 0
  END;
END;
$$;
