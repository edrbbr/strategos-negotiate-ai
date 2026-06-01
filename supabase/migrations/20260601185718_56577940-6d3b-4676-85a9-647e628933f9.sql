-- ============================================================
-- 1. RAG-Infrastruktur: pgvector + Wissensbasis-Tabellen
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Storage-Bucket für Buch-PDFs (privat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- Storage-Policies: nur Admins
CREATE POLICY "Admins read knowledge-base files"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-base' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload knowledge-base files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'knowledge-base' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update knowledge-base files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'knowledge-base' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete knowledge-base files"
ON storage.objects FOR DELETE
USING (bucket_id = 'knowledge-base' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Bücher-Tabelle (Metadata)
CREATE TABLE public.knowledge_books (
  book_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  file_path TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | uploaded | indexing | ready | error
  error_message TEXT,
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_books TO authenticated;
GRANT ALL ON public.knowledge_books TO service_role;

ALTER TABLE public.knowledge_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage knowledge books"
ON public.knowledge_books FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_knowledge_books_updated_at
BEFORE UPDATE ON public.knowledge_books
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chunk-Tabelle (Text + Embedding)
CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_key TEXT NOT NULL REFERENCES public.knowledge_books(book_key) ON DELETE CASCADE,
  chapter TEXT,
  page INTEGER,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(3072) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.knowledge_chunks TO authenticated;
GRANT ALL ON public.knowledge_chunks TO service_role;

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Lesen: Admins direkt, sonst nur über SECURITY-DEFINER-RPC
CREATE POLICY "Admins read knowledge chunks"
ON public.knowledge_chunks FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_knowledge_chunks_book ON public.knowledge_chunks(book_key);

-- Hinweis: pgvector HNSW unterstützt max 2000 dims für vector_cosine_ops.
-- Bei 3072 dims (Gemini) → kein HNSW; sequential scan reicht für ~5–10k Chunks.

-- Semantische Suche (SECURITY DEFINER, damit auch Edge-Functions via service_role konsistent zugreifen)
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(3072),
  match_count int DEFAULT 8,
  filter_books text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  book_key text,
  book_title text,
  chapter text,
  page integer,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.book_key,
    b.title AS book_title,
    c.chapter,
    c.page,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks c
  JOIN public.knowledge_books b ON b.book_key = c.book_key
  WHERE (filter_books IS NULL OR c.book_key = ANY(filter_books))
    AND b.status = 'ready'
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_knowledge(vector, int, text[]) TO authenticated, service_role;

-- Seed: 5 Verhandlungs-Bücher als leere Einträge
INSERT INTO public.knowledge_books (book_key, title, author, status) VALUES
  ('voss_never_split', 'Never Split the Difference', 'Chris Voss', 'pending'),
  ('greene_48_laws', 'The 48 Laws of Power', 'Robert Greene', 'pending'),
  ('malhotra_genius', 'Negotiation Genius', 'Malhotra & Bazerman', 'pending'),
  ('fisher_ury_yes', 'Getting to Yes', 'Fisher & Ury', 'pending'),
  ('kahneman_fast_slow', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'pending')
ON CONFLICT (book_key) DO NOTHING;

-- ============================================================
-- 2. Cases & case_versions: ELITE-Felder
-- ============================================================

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS escalation_level TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS recommended_variant TEXT,
  ADD COLUMN IF NOT EXISTS variants JSONB,
  ADD COLUMN IF NOT EXISTS clarifying_questions JSONB,
  ADD COLUMN IF NOT EXISTS plan_steps JSONB,
  ADD COLUMN IF NOT EXISTS knowledge_sources JSONB;

ALTER TABLE public.case_versions
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS recommended_variant TEXT,
  ADD COLUMN IF NOT EXISTS variants JSONB,
  ADD COLUMN IF NOT EXISTS clarifying_questions JSONB,
  ADD COLUMN IF NOT EXISTS plan_steps JSONB,
  ADD COLUMN IF NOT EXISTS knowledge_sources JSONB;

-- Constraints für Eskalationsstufen
ALTER TABLE public.cases
  ADD CONSTRAINT cases_escalation_level_check
  CHECK (escalation_level IN ('auto', 'soft', 'neutral', 'hard'));
