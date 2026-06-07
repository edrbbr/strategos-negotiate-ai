import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";

interface FaqItem { q: string; a: string }

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  category: "b2c" | "b2b";
  author: string;
  meta_title: string | null;
  meta_description: string;
  reading_minutes: number;
  faq: FaqItem[];
  published_at: string | null;
}

const MagazinArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from("magazin_articles")
        .select("slug,title,excerpt,content_md,category,author,meta_title,meta_description,reading_minutes,faq,published_at")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setArticle(data as unknown as Article);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="container mx-auto px-6 py-16">Lade…</div>;
  }

  if (notFound || !article) {
    return (
      <div className="container mx-auto px-6 py-16 max-w-2xl">
        <h1 className="font-serif text-3xl mb-4">Artikel nicht gefunden</h1>
        <Link to="/magazin"><Button variant="outline">Zurück zum Magazin</Button></Link>
      </div>
    );
  }

  const url = `https://pallanx.com/magazin/${article.slug}`;
  const publishedIso = article.published_at ?? new Date().toISOString();
  const faqList = Array.isArray(article.faq) ? article.faq : [];

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={article.meta_title ?? `${article.title} | Pallanx Magazin`}
        description={article.meta_description}
        path={`/magazin/${article.slug}`}
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.meta_description,
          author: { "@type": "Organization", name: article.author },
          publisher: { "@type": "Organization", name: "Pallanx" },
          datePublished: publishedIso,
          mainEntityOfPage: url,
        })}</script>
        {faqList.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqList.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}</script>
        )}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Start", item: "https://pallanx.com/" },
            { "@type": "ListItem", position: 2, name: "Magazin", item: "https://pallanx.com/magazin" },
            { "@type": "ListItem", position: 3, name: article.title, item: url },
          ],
        })}</script>
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-xl">Pallanx</Link>
          <nav className="text-sm text-muted-foreground">
            <Link to="/magazin" className="hover:text-foreground">Magazin</Link>
          </nav>
        </div>
      </header>

      <article className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={article.category === "b2b" ? "default" : "secondary"}>
            {article.category === "b2b" ? "Für Händler" : "Für Verbraucher"}
          </Badge>
          <span>{article.reading_minutes} Min. Lesezeit</span>
          <span>·</span>
          <span>{article.author}</span>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-serif prose-h1:text-4xl md:prose-h1:text-5xl prose-h2:mt-12">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content_md}</ReactMarkdown>
        </div>

        {faqList.length > 0 && (
          <section className="mt-16 pt-12 border-t">
            <h2 className="font-serif text-3xl mb-6">Häufige Fragen</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqList.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
          <p>
            Dieser Beitrag liefert allgemeine Informationen und ersetzt keine individuelle Rechtsberatung. Bei konkreten Streitfällen wenden Sie sich an eine Anwaltskanzlei oder die Verbraucherzentrale.
          </p>
          <div className="mt-6">
            <Link to="/magazin"><Button variant="outline">Weitere Artikel im Magazin</Button></Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default MagazinArticle;