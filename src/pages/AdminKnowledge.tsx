import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, BookOpen, Upload, RefreshCw, CheckCircle2, AlertCircle, Clock, Plus, XCircle, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

type Book = {
  book_key: string;
  title: string;
  author: string | null;
  file_path: string | null;
  chunk_count: number;
  status: "pending" | "uploaded" | "indexing" | "ready" | "error";
  error_message: string | null;
  indexed_at: string | null;
  updated_at: string;
  progress_phase: string | null;
  progress_done: number;
  progress_total: number;
  progress_updated_at: string | null;
};

const STATUS_STYLE: Record<Book["status"], string> = {
  pending: "border-border text-muted-foreground",
  uploaded: "border-secondary/40 text-secondary",
  indexing: "border-primary/40 text-primary",
  ready: "border-emerald-500/40 text-emerald-400",
  error: "border-destructive/40 text-destructive",
};

const STATUS_LABEL: Record<Book["status"], string> = {
  pending: "Wartet auf Upload",
  uploaded: "PDF hochgeladen",
  indexing: "Indexiere…",
  ready: "Bereit",
  error: "Fehler",
};

const STALL_THRESHOLD_MS = 180_000; // 3 min ohne Fortschritt => festhängend

const PHASE_LABEL: Record<string, string> = {
  downloading: "PDF wird geladen…",
  extracting: "Text wird extrahiert…",
  chunking: "Text wird zerlegt…",
  seeding: "Chunks werden gespeichert…",
  embedding: "Embeddings werden erzeugt…",
  stalled: "Steckt fest — bitte abbrechen & neu starten",
};

type ChunkStats = { total: number; embedded: number; pending: number };

function useChunkStats(books: Book[] | undefined) {
  const indexingKeys = (books ?? [])
    .filter((b) => b.status === "indexing")
    .map((b) => b.book_key)
    .sort()
    .join(",");

  return useQuery({
    queryKey: ["knowledge-chunk-stats", indexingKeys],
    enabled: indexingKeys.length > 0,
    refetchInterval: 2500,
    queryFn: async (): Promise<Record<string, ChunkStats>> => {
      const keys = indexingKeys.split(",").filter(Boolean);
      const results = await Promise.all(
        keys.map(async (key) => {
          const [{ count: total }, { count: pending }] = await Promise.all([
            supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("book_key", key),
            supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("book_key", key).is("embedding", null),
          ]);
          const t = total ?? 0;
          const p = pending ?? 0;
          return [key, { total: t, embedded: t - p, pending: p }] as const;
        }),
      );
      return Object.fromEntries(results);
    },
  });
}

function useBooks() {
  return useQuery({
    queryKey: ["knowledge-books"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase.from("knowledge_books").select("*").order("title");
      if (error) throw error;
      return (data ?? []) as Book[];
    },
    refetchInterval: (q) => {
      const rows = (q.state.data ?? []) as Book[];
      return rows.some((b) => b.status === "indexing") ? 3000 : false;
    },
  });
}

const AdminKnowledge = () => {
  const { data: books, isLoading } = useBooks();
  const { data: chunkStats } = useChunkStats(books);
  const qc = useQueryClient();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteBook, setDeleteBook] = useState<Book | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);

  const handleAddBook = async () => {
    const key = (newKey || slugify(newTitle)).trim();
    const title = newTitle.trim();
    if (!key || !title) {
      toast.error("Titel ist erforderlich.");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("knowledge_books").insert({
        book_key: key,
        title,
        author: newAuthor.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success(`„${title}“ angelegt. Jetzt PDF hochladen und indexieren.`);
      setAddOpen(false);
      setNewKey("");
      setNewTitle("");
      setNewAuthor("");
      qc.invalidateQueries({ queryKey: ["knowledge-books"] });
    } catch (e) {
      toast.error(`Anlegen fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setAdding(false);
    }
  };

  const ingest = useMutation({
    mutationFn: async (book: Book) => {
      if (!book.file_path) {
        throw new Error("Bitte zuerst eine PDF hochladen.");
      }
      const { data, error } = await supabase.functions.invoke("ingest-knowledge-base", {
        body: { book_key: book.book_key, phase: "start" },
      });
      if (error) throw error;
      return data ?? {};
    },
    onSuccess: () => {
      toast.success("Indexierung gestartet — der Fortschritt erscheint hier in Echtzeit.");
      qc.invalidateQueries({ queryKey: ["knowledge-books"] });
    },
    onError: (e: Error) => toast.error(`Indexierung fehlgeschlagen: ${e.message}`),
  });

  const cancel = useMutation({
    mutationFn: async (book: Book) => {
      const { error } = await supabase.functions.invoke("ingest-knowledge-base", {
        body: { book_key: book.book_key, phase: "cancel" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Indexierung abgebrochen.");
      qc.invalidateQueries({ queryKey: ["knowledge-books"] });
    },
    onError: (e: Error) => toast.error(`Abbruch fehlgeschlagen: ${e.message}`),
  });

  const resume = useMutation({
    mutationFn: async (book: Book) => {
      const { error } = await supabase.functions.invoke("ingest-knowledge-base", {
        body: { book_key: book.book_key, phase: "resume" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Embedding wird fortgesetzt — bereits erzeugte Chunks bleiben erhalten.");
      qc.invalidateQueries({ queryKey: ["knowledge-books"] });
    },
    onError: (e: Error) => toast.error(`Fortsetzen fehlgeschlagen: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (book: Book) => {
      const { error } = await supabase.functions.invoke("ingest-knowledge-base", {
        body: { book_key: book.book_key, phase: "delete" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Buch und alle Indizes entfernt.");
      setDeleteBook(null);
      setDeleteConfirm("");
      qc.invalidateQueries({ queryKey: ["knowledge-books"] });
    },
    onError: (e: Error) => toast.error(`Löschen fehlgeschlagen: ${e.message}`),
  });

  const handleUpload = async (book: Book, file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Bitte eine PDF-Datei wählen.");
      return;
    }

    setUploadingKey(book.book_key);

    try {
      const path = `${book.book_key}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("knowledge-base")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });

      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from("knowledge_books")
        .update({ file_path: path, status: "uploaded", error_message: null, chunk_count: 0, indexed_at: null })
        .eq("book_key", book.book_key);

      if (dbErr) throw dbErr;

      toast.success(`„${book.title}“ hochgeladen. PDF wird künftig lokal extrahiert und danach im Hintergrund eingebettet.`);
      qc.invalidateQueries({ queryKey: ["knowledge-books"] });
    } catch (e) {
      toast.error(`Upload fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingKey(null);
    }
  };

  const totalChunks = (books ?? []).reduce((sum, b) => sum + (b.chunk_count ?? 0), 0);
  const readyCount = (books ?? []).filter((b) => b.status === "ready").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <Logo subtitle="Knowledge Base" />
        <div className="flex items-center gap-6">
          <Link to="/admin" className="font-mono-label text-muted-foreground hover:text-foreground">Elite-Anfragen</Link>
          <Link to="/admin/content" className="font-mono-label text-muted-foreground hover:text-foreground">Content</Link>
          <Link to="/admin/analytics" className="font-mono-label text-muted-foreground hover:text-foreground">Analytics</Link>
          <Link to="/app/dashboard" className="font-mono-label text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" /> Zurück
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-10">
          <p className="font-mono-label text-primary mb-2">◆ RAG-Wissensbasis</p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="font-serif text-4xl md:text-5xl">Verhandlungs-Bibliothek</h1>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="gold-outline" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-2" /> Buch hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border border-primary/30">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">Neues Buch anlegen</DialogTitle>
                  <DialogDescription className="font-sans text-sm text-muted-foreground">
                    Erstelle einen Eintrag. Danach kannst du in der Liste die PDF hochladen und indexieren.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <p className="font-mono-label text-muted-foreground text-xs mb-1.5">Titel *</p>
                    <Input
                      value={newTitle}
                      onChange={(e) => {
                        setNewTitle(e.target.value);
                        if (!newKey) setNewKey(slugify(e.target.value));
                      }}
                      placeholder="z. B. Pre-Suasion"
                    />
                  </div>
                  <div>
                    <p className="font-mono-label text-muted-foreground text-xs mb-1.5">Autor</p>
                    <Input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="z. B. Robert Cialdini" />
                  </div>
                  <div>
                    <p className="font-mono-label text-muted-foreground text-xs mb-1.5">Book-Key (Slug)</p>
                    <Input
                      value={newKey}
                      onChange={(e) => setNewKey(slugify(e.target.value))}
                      placeholder="cialdini_pre_suasion"
                    />
                    <p className="font-mono-label text-muted-foreground/60 text-[10px] mt-1">
                      Eindeutiger interner Schlüssel. Wird auch als PDF-Dateiname genutzt.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>Abbrechen</Button>
                  <Button variant="gold" onClick={handleAddBook} disabled={adding || !newTitle.trim()}>
                    {adding && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />} Anlegen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Lade Buch-PDFs hoch und indexiere sie. Die ELITE-Pipeline retrievt vor jeder Analyse relevante Passagen aus diesen Quellen.
          </p>
          <div className="flex gap-6 mt-5 font-mono-label text-xs">
            <span className="text-emerald-400">{readyCount}/{books?.length ?? 0} bereit</span>
            <span className="text-muted-foreground">{totalChunks.toLocaleString("de-DE")} Chunks insgesamt</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : (
          <div className="space-y-4">
            {(books ?? []).map((b) => {
              const isUploading = uploadingKey === b.book_key;
              const isProcessing = (ingest.isPending && ingest.variables?.book_key === b.book_key) || b.status === "indexing";
              const s = chunkStats?.[b.book_key];
              const pendingEmbeds = s?.pending ?? 0;
              const heartbeatAge = b.progress_updated_at
                ? Date.now() - new Date(b.progress_updated_at).getTime()
                : Infinity;
              const stalled = b.status === "indexing" && heartbeatAge > STALL_THRESHOLD_MS;
              const canResume =
                (b.status === "error" || stalled) &&
                (s?.total ?? b.chunk_count) > 0 &&
                pendingEmbeds >= 0;

              return (
                <article key={b.book_key} className="border border-border/30 rounded-sm p-6 hover:border-primary/30 transition-colors">
                  <header className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex gap-4 items-start">
                      <BookOpen className="w-5 h-5 text-primary mt-1 shrink-0" />
                      <div>
                        <h2 className="font-serif text-xl">{b.title}</h2>
                        <p className="font-mono-label text-muted-foreground text-xs mt-1">
                          {b.author ?? "—"} · key: {b.book_key}
                        </p>
                        {b.chunk_count > 0 && (
                          <p className="font-mono-label text-muted-foreground text-xs mt-1">
                            {b.chunk_count.toLocaleString("de-DE")} Chunks
                            {b.indexed_at && ` · indexiert ${new Date(b.indexed_at).toLocaleDateString("de-DE")}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono-label border ${STATUS_STYLE[b.status]}`}>
                      {b.status === "ready" && <CheckCircle2 className="w-3 h-3" />}
                      {b.status === "indexing" && <Loader2 className="w-3 h-3 animate-spin" />}
                      {b.status === "error" && <AlertCircle className="w-3 h-3" />}
                      {(b.status === "pending" || b.status === "uploaded") && <Clock className="w-3 h-3" />}
                      {STATUS_LABEL[b.status]}
                    </span>
                  </header>

                  {b.error_message && (
                    <div className="mb-4 border-l-2 border-destructive/50 pl-4 text-xs text-destructive">
                      {b.error_message}
                    </div>
                  )}

                  {b.status === "indexing" && (() => {
                    const s = chunkStats?.[b.book_key];
                    const chunkTotal = s?.total ?? 0;
                    const embedded = s?.embedded ?? 0;

                    const phase = b.progress_phase ?? (chunkTotal > 0 ? "embedding" : "downloading");
                    const isEmbedPhase = phase === "embedding";

                    // Während des Embeddings sind DB-Counts (chunk_stats) die Wahrheit,
                    // davor zeigen wir den lokal gemeldeten Fortschritt aus knowledge_books.
                    const done = isEmbedPhase ? embedded : b.progress_done ?? 0;
                    const total = isEmbedPhase ? chunkTotal : b.progress_total ?? 0;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                    const lastHeartbeat = b.progress_updated_at ? new Date(b.progress_updated_at).getTime() : 0;
                    const ageMs = lastHeartbeat ? Date.now() - lastHeartbeat : Infinity;
                    const isStalled = ageMs > STALL_THRESHOLD_MS;

                    const label = isStalled ? PHASE_LABEL.stalled : (PHASE_LABEL[phase] ?? "Indexierung läuft…");

                    return (
                      <div className="mb-4 space-y-2">
                        <div className="flex justify-between font-mono-label text-xs">
                          <span className={isStalled ? "text-destructive" : "text-muted-foreground"}>
                            {label}
                            {total > 0 && ` · ${done.toLocaleString("de-DE")} / ${total.toLocaleString("de-DE")}`}
                          </span>
                          <span className={isStalled ? "text-destructive" : "text-primary"}>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })()}

                  <div className="flex flex-wrap gap-3 justify-end">
                    <input
                      ref={(el) => { fileInputs.current[b.book_key] = el; }}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(b, file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputs.current[b.book_key]?.click()}
                      disabled={isUploading || isProcessing}
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                      {b.file_path ? "PDF ersetzen" : "PDF hochladen"}
                    </Button>
                    {b.status === "indexing" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancel.mutate(b)}
                        disabled={cancel.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {cancel.isPending && cancel.variables?.book_key === b.book_key ? (
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 mr-2" />
                        )}
                        Abbrechen
                      </Button>
                    )}
                    {canResume && (
                      <Button
                        variant="gold-outline"
                        size="sm"
                        onClick={() => resume.mutate(b)}
                        disabled={resume.isPending}
                      >
                        {resume.isPending && resume.variables?.book_key === b.book_key ? (
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 mr-2" />
                        )}
                        Fortsetzen
                      </Button>
                    )}
                    <Button
                      variant="gold-outline"
                      size="sm"
                      disabled={!b.file_path || isProcessing || isUploading}
                      onClick={() => ingest.mutate(b)}
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                      {b.status === "ready" ? "Neu indexieren" : "Indexieren"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDeleteBook(b); setDeleteConfirm(""); }}
                      disabled={isProcessing || isUploading}
                      className="text-destructive hover:text-destructive"
                      title="Buch und alle Indizes löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Löschen
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-12 border-t border-border/20 pt-6 text-xs text-muted-foreground font-mono-label">
          <p>
            Hinweis: Die PDF wird komplett im Backend extrahiert, zerlegt und über google/gemini-embedding-001 (3072-dim) eingebettet. Bei einem Hänger bleibt der Fortschritt erhalten — „Fortsetzen" macht direkt weiter, ohne bereits erzeugte Chunks zu verwerfen.
          </p>
        </div>
      </main>

      <Dialog
        open={!!deleteBook}
        onOpenChange={(open) => {
          if (!open) { setDeleteBook(null); setDeleteConfirm(""); }
        }}
      >
        <DialogContent className="bg-card border border-destructive/40">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-destructive">Buch unwiderruflich löschen</DialogTitle>
            <DialogDescription className="font-sans text-sm text-muted-foreground">
              „{deleteBook?.title}" und alle zugehörigen Embeddings/Chunks sowie die hochgeladene PDF werden dauerhaft entfernt.
              Die ELITE-Pipeline wird diese Quelle danach nicht mehr nutzen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="font-mono-label text-muted-foreground text-xs">
              Zur Bestätigung den Book-Key eingeben: <span className="text-destructive">{deleteBook?.book_key}</span>
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteBook?.book_key ?? ""}
              autoFocus
              maxLength={120}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteBook(null); setDeleteConfirm(""); }} disabled={remove.isPending}>
              Abbrechen
            </Button>
            <Button
              variant="default"
              onClick={() => deleteBook && remove.mutate(deleteBook)}
              disabled={remove.isPending || deleteConfirm.trim() !== deleteBook?.book_key}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-2" />}
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKnowledge;