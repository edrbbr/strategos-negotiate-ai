CREATE TABLE public.magazin_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content_md TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('b2c','b2b')),
  audience TEXT,
  author TEXT NOT NULL DEFAULT 'Pallanx Redaktion',
  meta_title TEXT,
  meta_description TEXT NOT NULL,
  hero_image_url TEXT,
  reading_minutes INTEGER NOT NULL DEFAULT 5,
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.magazin_articles TO anon;
GRANT SELECT ON public.magazin_articles TO authenticated;
GRANT ALL ON public.magazin_articles TO service_role;

ALTER TABLE public.magazin_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
  ON public.magazin_articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all articles"
  ON public.magazin_articles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_magazin_articles_updated_at
  BEFORE UPDATE ON public.magazin_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_magazin_articles_status_pub ON public.magazin_articles(status, published_at DESC);
CREATE INDEX idx_magazin_articles_category ON public.magazin_articles(category) WHERE status = 'published';