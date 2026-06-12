import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, Linkedin, Copy, Sparkles, ArrowLeft, Check, Wand2, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  post_title: string | null;
  post_url: string | null;
  anonymized_situation: string | null;
  anonymized_outcome: string | null;
  generated_post: string | null;
  refinement_history: Array<{ instruction: string; at: string; by: string }> | null;
  created_at: string;
  curated_at: string | null;
  posted_at: string | null;
  case_situation?: string | null;
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
      const entries = (data ?? []) as unknown as PoolEntry[];
      const caseIds = Array.from(new Set(entries.map((e) => e.case_id))).filter(Boolean);
      if (caseIds.length > 0) {
        const { data: cases } = await supabase
          .from("cases")
          .select("id, situation_text")
          .in("id", caseIds);
        const byId = new Map((cases ?? []).map((c: { id: string; situation_text: string | null }) => [c.id, c.situation_text]));
        for (const e of entries) e.case_situation = byId.get(e.case_id) ?? null;
      }
      return entries;
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
  const [refineText, setRefineText] = useState<Record<string, string>>({});
  const [editingTitle, setEditingTitle] = useState<Record<string, string | null>>({});
  const [urlDraft, setUrlDraft] = useState<Record<string, string>>({});
  const [showUrlInput, setShowUrlInput] = useState<Record<string, boolean>>({});

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
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const { error } = await supabase
        .from("linkedin_pool")
        .update({ status: "posted", posted_at: new Date().toISOString(), post_url: url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linkedin-pool"] });
      toast.success("Veröffentlichung gespeichert.");
    },
  });

  const refine = useMutation({
    mutationFn: async ({ pool_id, instruction }: { pool_id: string; instruction: string }) => {
      const { data, error } = await supabase.functions.invoke("linkedin-case-generator", {
        body: { mode: "refine", pool_id, refinement_instruction: instruction },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success("Post verfeinert.");
      setRefineText((s) => ({ ...s, [vars.pool_id]: "" }));
      qc.invalidateQueries({ queryKey: ["linkedin-pool"] });
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });

  const saveTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("linkedin_pool").update({ post_title: title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      setEditingTitle((s) => ({ ...s, [vars.id]: null }));
      qc.invalidateQueries({ queryKey: ["linkedin-pool"] });
      toast.success("Titel gespeichert.");
    },
  });

  const updateUrl = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const { error } = await supabase.from("linkedin_pool").update({ post_url: url }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linkedin-pool"] });
      toast.success("URL aktualisiert.");
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
              const history = Array.isArray(p.refinement_history) ? p.refinement_history : [];
              const titleDraft = editingTitle[p.id];
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

                  {!p.generated_post && p.case_situation && (
                    <div className="mb-4 border-l-2 border-muted pl-4">
                      <p className="font-mono-label text-muted-foreground text-xs mb-1">Roh-Situation (User-Eingabe)</p>
                      <p className="text-sm text-foreground/80 leading-7 whitespace-pre-line">{p.case_situation}</p>
                    </div>
                  )}

                  {p.generated_post ? (
                    <div className="space-y-4">
                      {/* Title */}
                      <div className="border-l-2 border-primary/60 pl-4">
                        <p className="font-mono-label text-primary text-xs mb-1">Titel</p>
                        {titleDraft !== null && titleDraft !== undefined ? (
                          <div className="flex gap-2">
                            <Input
                              value={titleDraft}
                              onChange={(e) => setEditingTitle((s) => ({ ...s, [p.id]: e.target.value }))}
                              maxLength={120}
                            />
                            <Button size="sm" variant="gold" onClick={() => saveTitle.mutate({ id: p.id, title: titleDraft })} disabled={saveTitle.isPending}>Speichern</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTitle((s) => ({ ...s, [p.id]: null }))}>Abbrechen</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-serif text-lg text-foreground/90">{p.post_title ?? <span className="italic text-muted-foreground">(kein Titel)</span>}</p>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTitle((s) => ({ ...s, [p.id]: p.post_title ?? "" }))}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

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

                      {/* Refinement block */}
                      <div className="border border-border/30 rounded-sm p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-primary" />
                          <p className="font-mono-label text-primary text-xs">Post verfeinern</p>
                        </div>
                        <Textarea
                          placeholder="Was soll am Post angepasst werden? Z. B. ‚Schreibe direkter, weniger Erzählung, stärkere Pointe am Ende.‘"
                          value={refineText[p.id] ?? ""}
                          onChange={(e) => setRefineText((s) => ({ ...s, [p.id]: e.target.value }))}
                          rows={3}
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="gold-outline"
                            disabled={refine.isPending || !(refineText[p.id] ?? "").trim()}
                            onClick={() => refine.mutate({ pool_id: p.id, instruction: refineText[p.id].trim() })}
                          >
                            {refine.isPending && refine.variables?.pool_id === p.id ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-2" />}
                            Anwenden
                          </Button>
                        </div>
                        {history.length > 0 && (
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer font-mono-label">Bisherige Anpassungen ({history.length})</summary>
                            <ul className="mt-2 space-y-1 pl-3">
                              {history.map((h, i) => (
                                <li key={i} className="border-l border-border/40 pl-2">
                                  <span className="text-foreground/60">{new Date(h.at).toLocaleString("de-DE")}:</span> {h.instruction}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>

                      {/* Posted URL block */}
                      {p.status === "posted" && (
                        <div className="border-l-2 border-emerald-500/40 pl-4 space-y-2">
                          <p className="font-mono-label text-emerald-400 text-xs">Veröffentlicht</p>
                          {p.post_url ? (
                            <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all">
                              <ExternalLink className="w-3.5 h-3.5" /> {p.post_url}
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Keine URL hinterlegt.</p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://www.linkedin.com/feed/update/…"
                              value={urlDraft[p.id] ?? p.post_url ?? ""}
                              onChange={(e) => setUrlDraft((s) => ({ ...s, [p.id]: e.target.value }))}
                            />
                            <Button size="sm" variant="ghost" onClick={() => updateUrl.mutate({ id: p.id, url: (urlDraft[p.id] ?? "").trim() })} disabled={updateUrl.isPending}>URL speichern</Button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => copy(p.generated_post!)}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Post kopieren
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => copy(`${p.post_title ? p.post_title + "\n\n" : ""}${p.generated_post}`)}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Titel + Post kopieren
                        </Button>
                        {p.status !== "posted" && (
                          showUrlInput[p.id] ? (
                            <div className="flex gap-2 w-full">
                              <Input
                                placeholder="LinkedIn-Post-URL (Pflicht)"
                                value={urlDraft[p.id] ?? ""}
                                onChange={(e) => setUrlDraft((s) => ({ ...s, [p.id]: e.target.value }))}
                              />
                              <Button
                                size="sm"
                                variant="gold"
                                disabled={!((urlDraft[p.id] ?? "").trim().startsWith("http")) || markPosted.isPending}
                                onClick={() => markPosted.mutate({ id: p.id, url: urlDraft[p.id].trim() })}
                              >
                                <Check className="w-3.5 h-3.5 mr-2" /> Speichern
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setShowUrlInput((s) => ({ ...s, [p.id]: false }))}>Abbrechen</Button>
                            </div>
                          ) : (
                            <Button variant="gold-outline" size="sm" onClick={() => setShowUrlInput((s) => ({ ...s, [p.id]: true }))}>
                              <Check className="w-3.5 h-3.5 mr-2" /> Als gepostet markieren
                            </Button>
                          )
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