ALTER TABLE public.case_attachments
  ADD COLUMN IF NOT EXISTS refinement_for_version_id uuid;

CREATE INDEX IF NOT EXISTS case_attachments_refinement_for_version_id_idx
  ON public.case_attachments (refinement_for_version_id);