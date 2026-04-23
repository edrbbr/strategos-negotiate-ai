
-- =========== negotiation_strategies (lookup) ===========
CREATE TABLE public.negotiation_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.negotiation_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strategies are viewable by everyone"
  ON public.negotiation_strategies FOR SELECT USING (is_active = true);

INSERT INTO public.negotiation_strategies (key, label, description, sort_order) VALUES
  ('harvard', 'Harvard Negotiation', 'Prinzipiengeleitete Verhandlung: Interessen vor Positionen, objektive Kriterien, BATNA.', 10),
  ('chris_voss', 'Chris Voss', 'Tactical Empathy: Mirroring, Labeling, kalibrierte Fragen.', 20),
  ('ackerman', 'Ackerman-Modell', 'Strukturiertes Bietverfahren mit definierten Zielprozenten.', 30),
  ('batna', 'BATNA-fokussiert', 'Stärkung und Kommunikation der besten Alternative.', 40),
  ('win_win', 'Win-Win', 'Kooperative Lösungen mit beidseitigem Mehrwert.', 50),
  ('hard_bargaining', 'Hard Bargaining', 'Positionsstark, druckorientiert, klare Konsequenzen.', 60);

-- =========== case_versions ===========
CREATE TABLE public.case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version_number int NOT NULL,
  kind text NOT NULL CHECK (kind IN ('initial','refinement','restore')),
  user_prompt text,
  analysis jsonb,
  strategy text,
  draft text,
  strategy_labels text[] NOT NULL DEFAULT '{}',
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, version_number)
);
CREATE INDEX idx_case_versions_case_version ON public.case_versions (case_id, version_number DESC);

ALTER TABLE public.case_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own versions"
  ON public.case_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own versions"
  ON public.case_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own versions"
  ON public.case_versions FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.case_versions;
ALTER TABLE public.case_versions REPLICA IDENTITY FULL;

-- =========== cases additions ===========
ALTER TABLE public.cases
  ADD COLUMN current_version_id uuid,
  ADD COLUMN quick_suggestions jsonb,
  ADD COLUMN quick_suggestions_version_id uuid;
