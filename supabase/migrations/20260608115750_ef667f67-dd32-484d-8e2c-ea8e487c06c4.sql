
-- 1) business_custom_roles
CREATE TABLE public.business_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  label text NOT NULL,
  max_discount_percent numeric NOT NULL DEFAULT 10 CHECK (max_discount_percent >= 0 AND max_discount_percent <= 100),
  base_role text NOT NULL DEFAULT 'sachbearbeiter' CHECK (base_role IN ('sachbearbeiter','manager','leitung')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, role_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_custom_roles TO authenticated;
GRANT ALL ON public.business_custom_roles TO service_role;

ALTER TABLE public.business_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view custom roles"
  ON public.business_custom_roles FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_account_id));

CREATE POLICY "leitung can manage custom roles"
  ON public.business_custom_roles FOR ALL TO authenticated
  USING (
    public.business_role_rank(auth.uid(), business_account_id) >= 3
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.business_role_rank(auth.uid(), business_account_id) >= 3
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_business_custom_roles_updated
  BEFORE UPDATE ON public.business_custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) business_users.custom_role_key
ALTER TABLE public.business_users ADD COLUMN IF NOT EXISTS custom_role_key text;

-- 3) industries
CREATE TABLE public.industries (
  key text PRIMARY KEY,
  label text NOT NULL,
  ai_context text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.industries TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.industries TO authenticated;
GRANT ALL ON public.industries TO service_role;

ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read active industries"
  ON public.industries FOR SELECT TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "admin can manage industries"
  ON public.industries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_industries_updated
  BEFORE UPDATE ON public.industries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.industries (key, label, ai_context) VALUES
  ('moebelhandel', 'Möbelhandel', 'Möbelhandel: Kaufvertrag (§ 433 BGB), Mängelrechte §§ 437/439 BGB (Nacherfüllung zuerst), Beweislastumkehr § 477 BGB in den ersten 12 Monaten. Transportschäden: Spediteur-Haftung prüfen, Schadensanzeige beim Anliefern. Häufig: Maserabweichungen sind keine Sachmängel, Druckstellen nach Lieferung sind oft Spediteursache. Faire Lösung meist: Ersatz-/Reparaturmöglichkeit zuerst anbieten, dann erst Minderung. Keine pauschale Volle-Erstattung.'),
  ('kfz_werkstatt', 'KFZ-Werkstatt', 'KFZ-Werkstatt: Werkvertrag (§ 631 BGB), Mängelrechte §§ 633ff. (Nacherfüllung vor Minderung/Rücktritt). Diagnose-Pauschale auch ohne Reparaturauftrag möglich, wenn vorher vereinbart. Gewährleistung 2 Jahre auf Reparaturarbeiten und verbaute Neuteile, gebrauchte Teile abgrenzbar. Fahrlässige Folgeschäden separat prüfen. Faire Lösung: Nacharbeit zum Festpreis, Kulanz bei wiederholter Beanstandung.'),
  ('elektronikhandel', 'Elektronikhandel', 'Elektronikhandel: Kaufvertrag, Mängelrechte §§ 437/439 BGB, Beweislastumkehr § 477 BGB (erste 12 Monate). Klare Abgrenzung Garantie (freiwillig, Hersteller) vs. Gewährleistung (gesetzlich, Händler). Hersteller- vs. Händlerhaftung. Wasserschaden / Sturzschaden = idR Anwenderfehler, keine Gewährleistung. Akku-Verschleiß ist normal, erst bei <80% nach kurzer Zeit Mangel. Faire Lösung: Reparatur > Austausch > Erstattung.'),
  ('baumarkt', 'Baumarkt / DIY', 'Baumarkt: §§ 437/439 BGB. Werkzeug-Defekte oft Anwenderfehler vs. Materialfehler. Mietwerkzeug separat. Maßzuschnitte / Sonderbestellungen vom Widerruf ausgenommen. Faire Lösung: Reparatur oder gleichwertiger Ersatz.'),
  ('bekleidung', 'Bekleidung / Textil', 'Bekleidung: §§ 437/439 BGB, Beweislastumkehr 12 Monate. Pflegehinweise (Waschanleitung) entscheidend. Verfärbung nach falscher Wäsche = Anwenderfehler. Knopf abgefallen in den ersten Wochen = Mangel. Faire Lösung: Reparatur/Tausch, ggf. Wertgutschein.'),
  ('lebensmittel', 'Lebensmittelhandel', 'Lebensmittel: Verderb / MHD-Überschreitung, ProdHaftG bei Gesundheitsschäden. Schnelle, unkomplizierte Erstattung üblich, da Bagatellbeträge und Imagerisiko. Bei behauptetem Gesundheitsschaden: Vorgang dokumentieren, keine Schuldanerkenntnis ohne Prüfung.'),
  ('sonstiges', 'Sonstige Branche', 'Allgemeines deutsches Schuldrecht: Kaufvertrag §§ 433ff., Mängelrechte §§ 437/439, Beweislastumkehr § 477 BGB in den ersten 12 Monaten. Nacherfüllung hat Vorrang vor Minderung/Rücktritt. Faire Verhandlung: kleinstmögliches Zugeständnis, mit dem der Kunde sich noch als Gewinner fühlt.')
ON CONFLICT (key) DO NOTHING;

-- 4) helper function
CREATE OR REPLACE FUNCTION public.effective_discount_limit(_user uuid, _account uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_custom_key text;
  v_custom_limit numeric;
  v_limits jsonb;
BEGIN
  SELECT role, custom_role_key INTO v_role, v_custom_key
    FROM public.business_users
    WHERE auth_user_id = _user AND business_account_id = _account AND status = 'active'
    LIMIT 1;

  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_custom_key IS NOT NULL THEN
    SELECT max_discount_percent INTO v_custom_limit
      FROM public.business_custom_roles
      WHERE business_account_id = _account AND role_key = v_custom_key
      LIMIT 1;
    IF FOUND THEN RETURN v_custom_limit; END IF;
  END IF;

  SELECT max_discount_limits INTO v_limits
    FROM public.business_settings
    WHERE business_account_id = _account
    LIMIT 1;

  RETURN CASE v_role
    WHEN 'leitung' THEN COALESCE((v_limits->>'leitung_max_percent')::numeric, 100)
    WHEN 'manager' THEN COALESCE((v_limits->>'manager_max_percent')::numeric, 25)
    WHEN 'sachbearbeiter' THEN COALESCE((v_limits->>'sachbearbeiter_max_percent')::numeric, 10)
    ELSE 0
  END;
END;
$$;
