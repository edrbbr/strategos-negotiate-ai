
-- =========================================================
-- Pallanx Retail Shield: full B2B schema
-- =========================================================

-- Enums
CREATE TYPE public.business_role AS ENUM ('support_readonly','sachbearbeiter','manager','leitung');
CREATE TYPE public.business_case_status AS ENUM ('open','in_review','waiting_approval','closed','rejected');
CREATE TYPE public.approval_status AS ENUM ('pending','accepted','modified','rejected');

-- =========================================================
-- b2b_leads (public lead form)
-- =========================================================
CREATE TABLE public.b2b_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  industry text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  store_count text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.b2b_leads TO authenticated;
GRANT ALL ON public.b2b_leads TO service_role;
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage leads" ON public.b2b_leads
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- =========================================================
-- business_accounts
-- =========================================================
CREATE TABLE public.business_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  store_count int,
  billing_email text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_accounts TO authenticated;
GRANT ALL ON public.business_accounts TO service_role;
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- business_users
-- =========================================================
CREATE TABLE public.business_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  auth_user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  role public.business_role NOT NULL DEFAULT 'sachbearbeiter',
  is_primary_contact boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, auth_user_id)
);
CREATE INDEX idx_bu_auth ON public.business_users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_bu_account ON public.business_users(business_account_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_users TO authenticated;
GRANT ALL ON public.business_users TO service_role;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.get_user_business_account(_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT business_account_id FROM public.business_users
   WHERE auth_user_id=_user AND status='active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(_user uuid, _account uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.business_users
     WHERE auth_user_id=_user AND business_account_id=_account AND status='active'
  )
$$;

CREATE OR REPLACE FUNCTION public.business_role_rank(_user uuid, _account uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE role
    WHEN 'leitung' THEN 3 WHEN 'manager' THEN 2
    WHEN 'sachbearbeiter' THEN 1 WHEN 'support_readonly' THEN 0
  END
  FROM public.business_users
  WHERE auth_user_id=_user AND business_account_id=_account AND status='active' LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_user_business_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_role_rank(uuid, uuid) TO authenticated;

-- RLS: business_accounts
CREATE POLICY "Members read account" ON public.business_accounts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), id));
CREATE POLICY "Admins update account" ON public.business_accounts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), id) >= 3)
  WITH CHECK (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), id) >= 3);

-- RLS: business_users
CREATE POLICY "Members read users" ON public.business_users
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));
CREATE POLICY "Admins or self update user" ON public.business_users
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR auth_user_id = auth.uid()
         OR public.business_role_rank(auth.uid(), business_account_id) >= 2)
  WITH CHECK (has_role(auth.uid(),'admin') OR auth_user_id = auth.uid()
              OR public.business_role_rank(auth.uid(), business_account_id) >= 2);
CREATE POLICY "Admins delete user" ON public.business_users
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), business_account_id) >= 2);

-- =========================================================
-- business_settings
-- =========================================================
CREATE TABLE public.business_settings (
  business_account_id uuid PRIMARY KEY REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  max_discount_limits jsonb NOT NULL DEFAULT '{"sachbearbeiter_max_percent":10,"manager_max_percent":25,"leitung_max_percent":100}'::jsonb,
  kulanz_rules text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read settings" ON public.business_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));
CREATE POLICY "Leitung updates settings" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), business_account_id) >= 3)
  WITH CHECK (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), business_account_id) >= 3);

-- =========================================================
-- business_policies + chunks (RAG)
-- =========================================================
CREATE TABLE public.business_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  source_type text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'pending',
  chunk_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_policies TO authenticated;
GRANT ALL ON public.business_policies TO service_role;
ALTER TABLE public.business_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read policies" ON public.business_policies
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));
CREATE POLICY "Manager+ insert policies" ON public.business_policies
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), business_account_id) >= 2);
CREATE POLICY "Manager+ update policies" ON public.business_policies
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), business_account_id) >= 2)
  WITH CHECK (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), business_account_id) >= 2);
CREATE POLICY "Manager+ delete policies" ON public.business_policies
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.business_role_rank(auth.uid(), business_account_id) >= 2);

CREATE TABLE public.business_policy_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.business_policies(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(3072),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bpc_account ON public.business_policy_chunks(business_account_id);
CREATE INDEX idx_bpc_policy ON public.business_policy_chunks(policy_id);
GRANT SELECT ON public.business_policy_chunks TO authenticated;
GRANT ALL ON public.business_policy_chunks TO service_role;
ALTER TABLE public.business_policy_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read chunks" ON public.business_policy_chunks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));

-- Tenant RAG function
CREATE OR REPLACE FUNCTION public.match_business_knowledge(
  _account_id uuid,
  query_embedding vector(3072),
  match_count int DEFAULT 6
)
RETURNS TABLE(id uuid, policy_id uuid, content text, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT c.id, c.policy_id, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.business_policy_chunks c
  WHERE c.business_account_id = _account_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count
$$;
GRANT EXECUTE ON FUNCTION public.match_business_knowledge(uuid, vector, int) TO authenticated, service_role;

-- =========================================================
-- business_cases
-- =========================================================
CREATE TABLE public.business_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  case_number text NOT NULL,
  title text NOT NULL DEFAULT 'Reklamationsfall',
  product_category text,
  sku text,
  product_name text,
  purchase_price_total numeric(12,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  claimed_amount numeric(12,2) NOT NULL DEFAULT 0,
  suggested_offer numeric(12,2),
  suggested_offer_percent numeric(6,2),
  final_granted_amount numeric(12,2),
  final_granted_percent numeric(6,2),
  required_approval_role public.business_role,
  status public.business_case_status NOT NULL DEFAULT 'open',
  channel text NOT NULL DEFAULT 'in_store',
  customer_type text,
  situation_text text,
  notes text,
  ai_analysis jsonb,
  ai_options jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE (business_account_id, case_number)
);
CREATE INDEX idx_bc_account ON public.business_cases(business_account_id, created_at DESC);
CREATE INDEX idx_bc_status ON public.business_cases(business_account_id, status);
GRANT SELECT, INSERT, UPDATE ON public.business_cases TO authenticated;
GRANT ALL ON public.business_cases TO service_role;
ALTER TABLE public.business_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read cases" ON public.business_cases
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));
CREATE POLICY "Members insert cases" ON public.business_cases
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_account_id) AND created_by_user_id = auth.uid());
CREATE POLICY "Members update cases" ON public.business_cases
  FOR UPDATE TO authenticated
  USING (public.is_business_member(auth.uid(), business_account_id))
  WITH CHECK (public.is_business_member(auth.uid(), business_account_id));

-- Case number generator
CREATE OR REPLACE FUNCTION public.generate_business_case_number(_account_id uuid)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE n int;
BEGIN
  SELECT COUNT(*)+1 INTO n FROM public.business_cases
   WHERE business_account_id=_account_id
     AND created_at >= date_trunc('month', now());
  RETURN 'C-' || to_char(now(), 'YYMM') || '-' || lpad(n::text, 4, '0');
END $$;
GRANT EXECUTE ON FUNCTION public.generate_business_case_number(uuid) TO authenticated;

-- =========================================================
-- business_case_logs
-- =========================================================
CREATE TABLE public.business_case_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.business_cases(id) ON DELETE CASCADE,
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  system_suggestion jsonb,
  chosen_option jsonb,
  approval_role_used public.business_role,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bcl_case ON public.business_case_logs(case_id);
GRANT SELECT ON public.business_case_logs TO authenticated;
GRANT ALL ON public.business_case_logs TO service_role;
ALTER TABLE public.business_case_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read logs" ON public.business_case_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));

-- =========================================================
-- business_approvals
-- =========================================================
CREATE TABLE public.business_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.business_cases(id) ON DELETE CASCADE,
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  requested_by_user_id uuid NOT NULL,
  requested_by_role public.business_role NOT NULL,
  required_role public.business_role NOT NULL,
  requested_amount numeric(12,2) NOT NULL DEFAULT 0,
  requested_percent numeric(6,2) NOT NULL DEFAULT 0,
  ai_recommendation jsonb,
  justification text,
  status public.approval_status NOT NULL DEFAULT 'pending',
  decided_by_user_id uuid,
  decided_at timestamptz,
  decision_notes text,
  final_amount numeric(12,2),
  final_percent numeric(6,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ba_account ON public.business_approvals(business_account_id, status, created_at DESC);
GRANT SELECT ON public.business_approvals TO authenticated;
GRANT ALL ON public.business_approvals TO service_role;
ALTER TABLE public.business_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read approvals" ON public.business_approvals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));

-- =========================================================
-- business_billing + invoices
-- =========================================================
CREATE TABLE public.business_billing (
  business_account_id uuid PRIMARY KEY REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  billing_model text NOT NULL DEFAULT 'invoice',
  monthly_fee_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  payment_status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_billing TO authenticated;
GRANT ALL ON public.business_billing TO service_role;
ALTER TABLE public.business_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read billing" ON public.business_billing
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));
CREATE POLICY "Admins update billing" ON public.business_billing
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.business_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'draft',
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bi_account ON public.business_invoices(business_account_id, period_end DESC);
GRANT SELECT ON public.business_invoices TO authenticated;
GRANT ALL ON public.business_invoices TO service_role;
ALTER TABLE public.business_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read invoices" ON public.business_invoices
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));

-- =========================================================
-- Support tickets + messages
-- =========================================================
CREATE TABLE public.business_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  last_reply_by text,
  last_reply_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bst_account ON public.business_support_tickets(business_account_id, last_reply_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.business_support_tickets TO authenticated;
GRANT ALL ON public.business_support_tickets TO service_role;
ALTER TABLE public.business_support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read tickets" ON public.business_support_tickets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));
CREATE POLICY "Members insert tickets" ON public.business_support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_account_id) AND created_by_user_id = auth.uid());
CREATE POLICY "Members update tickets" ON public.business_support_tickets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id))
  WITH CHECK (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));

CREATE TABLE public.business_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.business_support_tickets(id) ON DELETE CASCADE,
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  author_type text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bsm_ticket ON public.business_support_messages(ticket_id, created_at);
GRANT SELECT, INSERT ON public.business_support_messages TO authenticated;
GRANT ALL ON public.business_support_messages TO service_role;
ALTER TABLE public.business_support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read messages" ON public.business_support_messages
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id));
CREATE POLICY "Members insert messages" ON public.business_support_messages
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(),'admin') OR public.is_business_member(auth.uid(), business_account_id))
              AND author_user_id = auth.uid());

-- =========================================================
-- KPI view
-- =========================================================
CREATE VIEW public.business_case_kpis WITH (security_invoker=on) AS
SELECT
  business_account_id,
  COUNT(*)::int AS total_cases,
  COUNT(*) FILTER (WHERE status IN ('open','in_review'))::int AS open_cases,
  COUNT(*) FILTER (WHERE status = 'waiting_approval')::int AS waiting_approval_cases,
  COUNT(*) FILTER (WHERE status IN ('closed','rejected'))::int AS closed_cases,
  COALESCE(SUM(purchase_price_total), 0)::numeric AS sum_purchase,
  COALESCE(SUM(claimed_amount), 0)::numeric AS sum_claimed,
  COALESCE(SUM(final_granted_amount), 0)::numeric AS sum_granted,
  COALESCE(SUM(claimed_amount - COALESCE(final_granted_amount, 0))
           FILTER (WHERE status = 'closed'), 0)::numeric AS sum_saved,
  COALESCE(AVG(final_granted_percent) FILTER (WHERE final_granted_percent IS NOT NULL), 0)::numeric AS avg_granted_percent,
  COUNT(*) FILTER (WHERE required_approval_role IN ('manager','leitung')
                   AND status IN ('waiting_approval','closed','rejected'))::int AS escalated_count
FROM public.business_cases
GROUP BY business_account_id;
GRANT SELECT ON public.business_case_kpis TO authenticated, service_role;

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE TRIGGER trg_b2b_leads_upd BEFORE UPDATE ON public.b2b_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_accounts_upd BEFORE UPDATE ON public.business_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_users_upd BEFORE UPDATE ON public.business_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_settings_upd BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_policies_upd BEFORE UPDATE ON public.business_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_cases_upd BEFORE UPDATE ON public.business_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_billing_upd BEFORE UPDATE ON public.business_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_invoices_upd BEFORE UPDATE ON public.business_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
