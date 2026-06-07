import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Pencil, Trash2, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Status = "draft" | "published" | "archived";
type Category = "b2c" | "b2b";

interface FaqItem { q: string; a: string }

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  category: Category;
  audience: string | null;
  author: string;
  meta_title: string | null;
  meta_description: string;
  hero_image_url: string | null;
  reading_minutes: number;
  faq: FaqItem[];
  status: Status;
  published_at: string | null;
  updated_at: string;
}

const EMPTY: Omit<Article, "id" | "updated_at"> = {
  slug: "",
  title: "",
  excerpt: "",
  content_md: "",
  category: "b2c",
  audience: null,
  author: "Pallanx Redaktion",
  meta_title: null,
  meta_description: "",
  hero_image_url: null,
  reading_minutes: 5,
  faq: [],
  status: "draft",
  published_at: null,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const AdminMagazin = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [draft, setDraft] = useState<typeof EMPTY>(EMPTY);
  const [faqJson, setFaqJson] = useState("[]");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("magazin_articles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setArticles((data ?? []) as unknown as Article[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setDraft(EMPTY);
    setFaqJson("[]");
  }

  function openEdit(a: Article) {
    setEditing(a);
    const { id: _id, updated_at: _u, ...rest } = a;
    setDraft({ ...rest, faq: a.faq ?? [] });
    setFaqJson(JSON.stringify(a.faq ?? [], null, 2));
  }

  function closeDialog() {
    setEditing(null);
    setDraft(EMPTY);
  }

  const [openFlag, setOpenFlag] = useState(false);

  async function save() {
    if (!draft.slug || !draft.title || !draft.excerpt || !draft.content_md || !draft.meta_description) {
      toast.error("Pflichtfelder: Slug, Titel, Excerpt, Content, Meta-Description");
      return;
    }
    let parsedFaq: FaqItem[] = [];
    try {
      parsedFaq = JSON.parse(faqJson);
      if (!Array.isArray(parsedFaq)) throw new Error("FAQ muss ein Array sein");
    } catch (e: any) {
      toast.error("FAQ JSON ungültig: " + e.message);
      return;
    }

    setSaving(true);
    const payload = {
      ...draft,
      faq: parsedFaq,
      published_at:
        draft.status === "published"
          ? draft.published_at ?? new Date().toISOString()
          : draft.published_at,
    };

    if (editing) {
      const { error } = await supabase
        .from("magazin_articles")
        .update(payload as never)
        .eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Aktualisiert");
    } else {
      const { error } = await supabase.from("magazin_articles").insert(payload as never);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Angelegt");
    }
    setSaving(false);
    setOpenFlag(false);
    closeDialog();
    load();
  }

  async function remove(a: Article) {
    if (!confirm(`Artikel "${a.title}" wirklich löschen?`)) return;
    const { error } = await supabase.from("magazin_articles").delete().eq("id", a.id);
    if (error) toast.error(error.message);
    else { toast.success("Gelöscht"); load(); }
  }

  async function togglePublish(a: Article) {
    const next: Status = a.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("magazin_articles")
      .update({
        status: next,
        published_at: next === "published" ? (a.published_at ?? new Date().toISOString()) : a.published_at,
      } as never)
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else { toast.success(next === "published" ? "Veröffentlicht" : "Auf Entwurf zurückgesetzt"); load(); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <Logo subtitle="Magazin · Redaktion" />
        <Link to="/admin" className="font-mono-label text-muted-foreground hover:text-foreground">← Admin</Link>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-mono-label text-primary mb-2">Redaktion</p>
            <h1 className="font-serif text-4xl">Magazin-Artikel</h1>
          </div>
          <Dialog open={openFlag} onOpenChange={(o) => { setOpenFlag(o); if (!o) closeDialog(); }}>
            <Button onClick={() => { openNew(); setOpenFlag(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Neuer Artikel
            </Button>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Artikel bearbeiten" : "Neuer Artikel"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Titel *</Label>
                    <Input
                      value={draft.title}
                      onChange={(e) => {
                        const t = e.target.value;
                        setDraft((d) => ({ ...d, title: t, slug: editing ? d.slug : slugify(t) }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Slug *</Label>
                    <Input value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Kategorie *</Label>
                    <Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v as Category }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="b2c">B2C (Verbraucher)</SelectItem>
                        <SelectItem value="b2b">B2B (Händler)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as Status }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Entwurf</SelectItem>
                        <SelectItem value="published">Veröffentlicht</SelectItem>
                        <SelectItem value="archived">Archiviert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Author</Label>
                    <Input value={draft.author} onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Lesezeit (Min.)</Label>
                    <Input
                      type="number" min={1}
                      value={draft.reading_minutes}
                      onChange={(e) => setDraft((d) => ({ ...d, reading_minutes: Number(e.target.value) || 5 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Excerpt * (1–2 Sätze, Listing)</Label>
                  <Textarea rows={2} value={draft.excerpt} onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))} />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Meta-Title (optional)</Label>
                    <Input value={draft.meta_title ?? ""} onChange={(e) => setDraft((d) => ({ ...d, meta_title: e.target.value || null }))} />
                  </div>
                  <div>
                    <Label>Meta-Description * (≤160 Zeichen)</Label>
                    <Input
                      value={draft.meta_description}
                      maxLength={170}
                      onChange={(e) => setDraft((d) => ({ ...d, meta_description: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Content (Markdown) *</Label>
                  <Textarea
                    rows={16}
                    className="font-mono text-xs"
                    value={draft.content_md}
                    onChange={(e) => setDraft((d) => ({ ...d, content_md: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>FAQ (JSON-Array: <code>{`[{"q":"...","a":"..."}]`}</code>)</Label>
                  <Textarea
                    rows={6}
                    className="font-mono text-xs"
                    value={faqJson}
                    onChange={(e) => setFaqJson(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenFlag(false)}>Abbrechen</Button>
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Speichern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading && <div className="text-muted-foreground">Lade…</div>}

        {!loading && articles.length === 0 && (
          <div className="border border-dashed rounded p-12 text-center text-muted-foreground">
            Noch keine Artikel.
          </div>
        )}

        <div className="space-y-3">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 border rounded bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={a.status === "published" ? "default" : "secondary"}>
                    {a.status === "published" ? "Live" : a.status === "draft" ? "Entwurf" : "Archiv"}
                  </Badge>
                  <Badge variant="outline">{a.category.toUpperCase()}</Badge>
                  <span className="text-xs text-muted-foreground">{a.reading_minutes} Min.</span>
                </div>
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground truncate">/magazin/{a.slug}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => togglePublish(a)}>
                  <Eye className="w-4 h-4 mr-1" />
                  {a.status === "published" ? "Depublish" : "Publish"}
                </Button>
                {a.status === "published" && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/magazin/${a.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { openEdit(a); setOpenFlag(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminMagazin;