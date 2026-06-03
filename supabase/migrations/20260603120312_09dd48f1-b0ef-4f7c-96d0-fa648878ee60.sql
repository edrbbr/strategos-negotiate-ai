
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS default_vat_rate numeric NOT NULL DEFAULT 19;

DROP POLICY IF EXISTS "Manager+ insert settings" ON public.business_settings;
CREATE POLICY "Manager+ insert settings"
  ON public.business_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR business_role_rank(auth.uid(), business_account_id) >= 2);

-- Auto-create a settings row when a business_account is created
CREATE OR REPLACE FUNCTION public.create_default_business_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_settings (business_account_id)
  VALUES (NEW.id)
  ON CONFLICT (business_account_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_business_settings ON public.business_accounts;
CREATE TRIGGER trg_create_default_business_settings
AFTER INSERT ON public.business_accounts
FOR EACH ROW EXECUTE FUNCTION public.create_default_business_settings();

-- Backfill missing settings rows for existing accounts
INSERT INTO public.business_settings (business_account_id)
SELECT a.id FROM public.business_accounts a
LEFT JOIN public.business_settings s ON s.business_account_id = a.id
WHERE s.business_account_id IS NULL;
