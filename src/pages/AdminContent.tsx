import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, Linkedin, Copy, Sparkles, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PoolEntry = {
  id: string;
  case_id: string;
  user_id: string;
  user_consent: boolean;
  status: string;
  template_key: string | null;
  anonymized_situation: string | null;
  anonymized_outcome: string | null;
  generated_post: string | null;
  created_at: string;
  curated_at: string | null;
  posted_at: string | null;
};

type Template = { key: string; label: string };

const STATUS_TONE: Record<string, string> = {
  pending: "border-primary/40 text-primary",
  generated: "border-secondary/40 text-secondary",
  posted: "border-emerald-500/40 text-emerald-400",
  rejected: "border-muted text-muted-foreground",
};

function usePool() {
  return useQuery({
    queryKey: ["linkedin-pool"],
    queryFn: async (): Promise<PoolEntry[]> => {
      const { data, error } = await supabase
        .from("linkedin_pool")
        .select("*")
        .eq("user_consent", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PoolEntry[];
    },
  });
}

function useTemplates() {
  return useQuery({
    queryKey: ["linkedin-templates"],
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from("linkedin_templates")
        .select("key, label")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
    staleTime: 10 * 60_000,
  });
}

const AdminContent = () => {
  const { data: pool, isLoading } = usePool();
  const { data: templates = [] } = useTemplates();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, string>>({});

  const generate = useMutation({
    mutationFn: async ({ pool_id, template_key }: { pool_id: string; template_key: string }) => {
      const { data, error } = await supabase.functions.invoke("linkedin-case-generator", {
        body: { pool_id, template_key },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Post generiert.");
      qc.invalidateQueries({ queryKey: ["linkedin-pool"] });
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });

  const markPosted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("linkedin_pool")
        .update({ status: "posted", posted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linkedin-pool"] });
      toast.success("Als gepostet markiert.");
    },
  });

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Kopiert.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <Logo subtitle="Content Curator" />
        <div className="flex items-center gap-6">
          <Link to="/admin" className="font-mono-label text-muted-foreground hover:text-foreground">Elite-Anfragen</Link>
          <Link to="/app/dashboard" className="font-mono-label text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" /> Zurück zur App
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-10">
          <p className="font-mono-label text-primary mb-2">◆ LinkedIn Pool</p>
          <h1 className="font-serif text-4xl md:text-5xl">User-freigegebene Cases</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            User haben diesen Fällen zugestimmt, anonymisiert verwendet zu werden.
            Template wählen → generieren → vor Veröffentlichung gegenlesen → posten.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : (pool ?? []).length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/30 rounded-sm">
            <Linkedin className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Noch keine Freigaben im Pool.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(pool ?? []).map((p) => {
              const tplKey = selected[p.id] ?? p.template_key ?? "";
              const tone = STATUS_TONE[p.status] ?? "border-border text-muted-foreground";
              return (
                <article key={p.id} className="border border-border/30 rounded-sm p-6 hover:border-primary/30 transition-colors">
                  <header className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="font-mono-label text-muted-foreground text-xs">
                        Case {p.case_id.slice(0, 8)} · {new Date(p.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-mono-label border ${tone}`}>{p.status}</span>
                  </header>

                  {p.generated_post ? (
                    <div className="space-y-4">
                      {p.anonymized_situation && (
                        <div className="border-l-2 border-secondary/40 pl-4">
                          <p className="font-mono-label text-muted-foreground text-xs mb-1">Anonymisierte Situation</p>
                          <p className="text-sm text-foreground/85 leading-7">{p.anonymized_situation}</p>
                        </div>
                      )}
                      <div className="border-l-2 border-primary pl-4">
                        <p className="font-mono-label text-primary text-xs mb-1">Post</p>
                        <p className="font-serif text-base leading-relaxed text-foreground/90 whitespace-pre-line">{p.generated_post}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => copy(p.generated_post!)}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Post kopieren
                        </Button>
                        {p.status !== "posted" && (
                          <Button variant="gold-outline" size="sm" onClick={() => markPosted.mutate(p.id)} disabled={markPosted.isPending}>
                            <Check className="w-3.5 h-3.5 mr-2" /> Als gepostet markieren
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="font-mono-label text-muted-foreground text-xs">Noch kein Post generiert.</p>
                      <div className="flex flex-wrap gap-3 items-center">
                        <div className="min-w-[240px]">
                          <Select
                            value={tplKey}
                            onValueChange={(v) => setSelected((s) => ({ ...s, [p.id]: v }))}
                          >
                            <SelectTrigger className="font-mono-label">
                              <SelectValue placeholder="Template wählen…" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((t) => (
                                <SelectItem key={t.key} value={t.key} className="font-mono-label">{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="gold"
                          size="sm"
                          disabled={!tplKey || generate.isPending}
                          onClick={() => generate.mutate({ pool_id: p.id, template_key: tplKey })}
                        >
                          {generate.isPending && generate.variables?.pool_id === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                          )}
                          Post generieren
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminContent;