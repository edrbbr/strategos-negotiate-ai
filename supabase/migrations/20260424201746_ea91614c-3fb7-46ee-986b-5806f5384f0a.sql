ALTER TABLE public.case_versions
  ADD COLUMN IF NOT EXISTS change_rationale text;