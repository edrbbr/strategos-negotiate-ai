ALTER TABLE public.knowledge_chunks ALTER COLUMN embedding DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_pending ON public.knowledge_chunks(book_key) WHERE embedding IS NULL;