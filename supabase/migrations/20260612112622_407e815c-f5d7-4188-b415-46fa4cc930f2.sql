UPDATE public.plans SET model_id = 'claude-sonnet-4-5', pipeline_config = NULL WHERE id = 'free';
UPDATE public.plans SET model_id = 'claude-sonnet-4-5', pipeline_config = NULL WHERE id = 'single_case';
UPDATE public.plans SET model_id = 'claude-sonnet-4-5', pipeline_config = NULL WHERE id = 'pro';
UPDATE public.plans SET model_id = 'claude-sonnet-4-5', pipeline_config = '{"type":"combined_sections"}'::jsonb WHERE id = 'elite';