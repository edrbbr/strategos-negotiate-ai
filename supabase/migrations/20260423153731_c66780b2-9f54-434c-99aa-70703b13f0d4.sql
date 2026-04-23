-- 1. Add columns to cases
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS medium text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS language_code text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS language_label text NOT NULL DEFAULT 'Deutsch';

-- 2. Create case_attachments table
CREATE TABLE IF NOT EXISTS public.case_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer,
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_attachments_case_id ON public.case_attachments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_attachments_user_id ON public.case_attachments(user_id);

ALTER TABLE public.case_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own attachments"
  ON public.case_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own attachments"
  ON public.case_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own attachments"
  ON public.case_attachments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own attachments"
  ON public.case_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-attachments', 'case-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access their own folder <user_id>/...
CREATE POLICY "Users read own case files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own case files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own case files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own case files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);