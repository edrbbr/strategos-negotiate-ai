
CREATE TABLE public.ai_provider_settings (
  id text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
  chat_provider text NOT NULL DEFAULT 'anthropic',
  chat_model text NOT NULL DEFAULT 'claude-sonnet-4-5',
  vision_provider text NOT NULL DEFAULT 'anthropic',
  vision_model text NOT NULL DEFAULT 'claude-sonnet-4-5',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.ai_provider_settings TO authenticated;
GRANT ALL ON public.ai_provider_settings TO service_role;

ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_provider_read_authenticated"
  ON public.ai_provider_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "ai_provider_write_admin_only"
  ON public.ai_provider_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ai_provider_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;
