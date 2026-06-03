-- B2B Case Versioning: speichert jede Pipeline-Iteration (initial + refinements)
CREATE TABLE public.business_case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.business_cases(id) ON DELETE CASCADE,
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('initial','refinement','restore')),
  user_prompt text,
  ai_analysis jsonb,
  ai_options jsonb,
  recommended_index integer,
  required_role business_role,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, version_number)
);

CREATE INDEX idx_bcv_case ON public.business_case_versions(case_id, version_number DESC);

GRANT SELECT, INSERT ON public.business_case_versions TO authenticated;
GRANT ALL ON public.business_case_versions TO service_role;

ALTER TABLE public.business_case_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read versions"
  ON public.business_case_versions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_business_member(auth.uid(), business_account_id));

CREATE POLICY "Members insert versions"
  ON public.business_case_versions FOR INSERT TO authenticated
  WITH CHECK (is_business_member(auth.uid(), business_account_id));

-- current_version_id auf business_cases
ALTER TABLE public.business_cases
  ADD COLUMN current_version_id uuid REFERENCES public.business_case_versions(id) ON DELETE SET NULL;
