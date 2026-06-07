import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";

interface ArticleListItem {
  slug: string;
  title: string;
  excerpt: string;
  category: "b2c" | "b2b";
  reading_minutes: number;
  published_at: string | null;
}

const MagazinIndex = () => {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("magazin_articles")
        .select("slug,title,excerpt,category,reading_minutes,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      setArticles((data ?? []) as ArticleListItem[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Magazin — Reklamationen, Verbraucherrecht & Handelsprozesse | Pallanx"
        description="Praxisnahe Artikel zu BGB-Rechten für Verbraucher und zu wirtschaftlich-fairer Reklamationsbearbeitung für Händler. Redaktionell, sachlich, ohne Rechtsberatung."
        path="/magazin"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Pallanx Magazin",
          url: "https://pallanx.com/magazin",
        })}</script>
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-xl">Pallanx</Link>
          <nav className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Start</Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="font-serif text-4xl md:text-5xl mb-4">Magazin</h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
          Sachliche Artikel zu Reklamationsrecht, Verbraucherrechten und Prozessen im Handel. Information — kein Rechtsrat.
        </p>

        {loading && <p className="text-muted-foreground">Lade Artikel…</p>}

        {!loading && articles.length === 0 && (
          <p className="text-muted-foreground">Noch keine Artikel veröffentlicht.</p>
        )}

        <div className="grid gap-6">
          {articles.map((a) => (
            <Link key={a.slug} to={`/magazin/${a.slug}`} className="block group">
              <Card className="transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Badge variant={a.category === "b2b" ? "default" : "secondary"}>
                      {a.category === "b2b" ? "Für Händler" : "Für Verbraucher"}
                    </Badge>
                    <span>{a.reading_minutes} Min. Lesezeit</span>
                  </div>
                  <CardTitle className="font-serif text-2xl group-hover:text-primary transition-colors">
                    {a.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{a.excerpt}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MagazinIndex;