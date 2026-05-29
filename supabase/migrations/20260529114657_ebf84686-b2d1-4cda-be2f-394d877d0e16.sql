
-- ============================================================
-- Phase 3 — LinkedIn Content System
-- ============================================================

-- Pool: user-freigegebene Cases, optional vom Admin kuratiert + Post generiert.
CREATE TABLE public.linkedin_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_consent BOOLEAN NOT NULL DEFAULT false,
  consent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | curated | generated | posted | rejected
  template_key TEXT,
  anonymized_situation TEXT,
  anonymized_outcome TEXT,
  generated_post TEXT,
  curator_notes TEXT,
  curated_by UUID,
  curated_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.linkedin_pool TO authenticated;
GRANT ALL ON public.linkedin_pool TO service_role;

ALTER TABLE public.linkedin_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own linkedin pool entries"
  ON public.linkedin_pool FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own consent"
  ON public.linkedin_pool FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own consent"
  ON public.linkedin_pool FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all linkedin pool"
  ON public.linkedin_pool FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update linkedin pool"
  ON public.linkedin_pool FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_linkedin_pool_updated
  BEFORE UPDATE ON public.linkedin_pool
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX uniq_linkedin_pool_case ON public.linkedin_pool(case_id);
CREATE INDEX idx_linkedin_pool_status ON public.linkedin_pool(status, created_at DESC);

-- Templates: 10 LinkedIn-Post-Vorlagen, von Admin verwaltbar
CREATE TABLE public.linkedin_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  prompt_skeleton TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.linkedin_templates TO authenticated;
GRANT ALL ON public.linkedin_templates TO service_role;

ALTER TABLE public.linkedin_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates viewable by authenticated"
  ON public.linkedin_templates FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage templates"
  ON public.linkedin_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.linkedin_templates (key, label, description, prompt_skeleton, sort_order) VALUES
  ('pain_story', 'Pain Story', 'Ehrliche Geschichte aus einer Verhandlung, die schief lief, und wie PALLANX geholfen hat.', 'Schreibe einen LinkedIn-Post (max. 1300 Zeichen) als ehrliche Geschichte aus der Ich-Perspektive einer/eines Selbstständigen. Hook in Zeile 1 mit einem Pain-Moment. Dann: was schief lief, wie PALLANX einen Ausweg lieferte, Outcome. Keine Hashtag-Wand, max. 3 relevante Hashtags am Ende.', 10),
  ('number_drop', 'Number Drop', 'Eine konkrete Zahl als Hook (Honorarsteigerung, Stunden gespart).', 'Schreibe einen LinkedIn-Post mit einer konkreten Zahl als Hook in Zeile 1 (z. B. "+18 % Honorar in 5 Minuten"). Dann: kurze Erklärung des Falls (anonymisiert), 3 Lessons als Bullet-Liste, Schluss mit nüchterner Beobachtung. Max. 1100 Zeichen.', 20),
  ('before_after', 'Before / After', 'Direkter Vergleich: Was wäre passiert ohne PALLANX vs. mit.', 'Schreibe einen LinkedIn-Post im Before/After-Format. Aufbau: "Vorher:" (3 Zeilen, schmerzhaft, ehrlich) — "Nachher:" (3 Zeilen, konkret, mit Zahl). Schluss: eine ruhige Beobachtung über Verhandlungsführung. Max. 1000 Zeichen.', 30),
  ('hot_take', 'Hot Take', 'Konträre Meinung zu einer Verhandlungs-Weisheit.', 'Schreibe einen LinkedIn-Post mit einer konträren Meinung in Zeile 1 (z. B. "Coaches lehren euch das Falsche über Honorarverhandlungen."). Dann 3-4 Argumente, knapp, mit dem konkreten Fall als Beweis. Schluss: provokative Frage. Max. 1200 Zeichen.', 40),
  ('script_snippet', 'Skript-Snippet', 'Wortwörtliche Verhandlungsformulierung zum Kopieren.', 'Schreibe einen LinkedIn-Post, der eine konkrete Formulierung zum Kopieren liefert. Hook: "Diese 2 Sätze haben mir +X € gebracht:". Dann: die Sätze im Zitat. Dann: kurze Erklärung warum es funktioniert. Max. 900 Zeichen.', 50),
  ('contract_clause', 'Vertragsklausel', 'Eine kritische Klausel und wie man sie entschärft.', 'Schreibe einen LinkedIn-Post über eine kritische Vertragsklausel (z. B. unbegrenzte Haftung, Nutzungsrechte). Hook: "Diese eine Klausel kostet dich im Worst Case alles." Dann: Klausel-Text (anonymisiert), warum gefährlich, Gegenformulierung. Max. 1300 Zeichen.', 60),
  ('chatgpt_vs', 'ChatGPT vs. PALLANX', 'Direkter Vergleich der Ergebnisqualität.', 'Schreibe einen LinkedIn-Post, der ehrlich vergleicht: ChatGPT-Output vs. PALLANX-Output für denselben Verhandlungsfall. Nicht abwertend, sondern analytisch. Zeige Output-Snippets nebeneinander. Schluss: was den Unterschied macht. Max. 1300 Zeichen.', 70),
  ('founder_note', 'Founder Note', 'Persönliche Notiz vom Gründer hinter PALLANX.', 'Schreibe einen LinkedIn-Post als persönliche Notiz vom Gründer. Thema: warum PALLANX existiert, was wir gerade gelernt haben, was als nächstes kommt. Ruhig, ehrlich, ohne Marketing-Sprache. Max. 1200 Zeichen.', 80),
  ('carousel_hook', 'Carousel Hook', 'Erste Folie eines Carousels + Inhaltsverzeichnis.', 'Schreibe Text für ein 8-Folien-Carousel über einen Verhandlungsfall. Liefere: (1) Cover-Slide-Titel, (2) Cover-Subtitle, (3) Inhaltsverzeichnis der 6 Inhalts-Slides, (4) Caption für den Post unter dem Carousel (max. 600 Zeichen, mit Hook).', 90),
  ('poll', 'Poll', 'Engagement-Poll mit Verhandlungs-Thema.', 'Schreibe einen LinkedIn-Poll: Frage (max. 140 Zeichen) + 4 Antwortoptionen (je max. 30 Zeichen) + Caption-Text (max. 500 Zeichen) der den Fall andeutet, der die Poll-Idee inspiriert hat.', 100);

-- ============================================================
-- Phase 4 — Analytics Events
-- ============================================================
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (
    user_id IS NULL OR auth.uid() IS NULL OR auth.uid() = user_id
  );

CREATE POLICY "Admins read all events"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_analytics_events_name_created ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_id, created_at DESC);
