import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Linkedin, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

type PublicPost = {
  id: string;
  post_title: string | null;
  generated_post: string | null;
  post_url: string | null;
  posted_at: string | null;
};

function useInsights() {
  return useQuery({
    queryKey: ["public-insights"],
    queryFn: async (): Promise<PublicPost[]> => {
      const { data, error } = await supabase
        .from("linkedin_pool_public" as any)
        .select("id, post_title, generated_post, post_url, posted_at")
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PublicPost[];
    },
  });
}

const Insights = () => {
  const { data, isLoading } = useInsights();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <Link to="/"><Logo subtitle="Insights" /></Link>
        <Link to="/" className="font-mono-label text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs">
          <ArrowLeft className="w-3 h-3" /> Zurück
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-16">
        <div className="mb-12">
          <p className="font-mono-label text-primary mb-2 text-xs uppercase tracking-[0.25em]">◆ Aus der Praxis</p>
          <h1 className="font-serif text-4xl md:text-5xl">Insights</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            Anonymisierte Cases und Beobachtungen aus echten Verhandlungen — gespiegelt aus unserem LinkedIn-Kanal.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Lade…</p>
        ) : (data ?? []).length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/30 rounded-sm">
            <Linkedin className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Noch keine veröffentlichten Insights.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(data ?? []).map((p) => (
              <article key={p.id} className="border border-border/30 rounded-sm p-6 hover:border-primary/30 transition-colors">
                {p.posted_at && (
                  <p className="font-mono-label text-muted-foreground text-xs mb-3">
                    {new Date(p.posted_at).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
                {p.post_title && <h2 className="font-serif text-2xl mb-3 text-foreground/90">{p.post_title}</h2>}
                {p.generated_post && (
                  <p className="text-foreground/80 leading-7 whitespace-pre-line line-clamp-[12]">{p.generated_post}</p>
                )}
                {p.post_url && (
                  <a
                    href={p.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Linkedin className="w-3.5 h-3.5" /> Auf LinkedIn ansehen <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Insights;