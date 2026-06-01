import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, BookOpen, Upload, RefreshCw, CheckCircle2, AlertCircle, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { extractKnowledgeChunksFromPdf } from "@/lib/knowledgeChunking";

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

const CHUNK_UPLOAD_BATCH_SIZE = 100;

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
  const qc = useQueryClient();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [adding, setAdding] = useState(false);

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

      const { data: file, error: downloadError } = await supabase.storage
        .from("knowledge-base")
        .download(book.file_path);

      if (downloadError || !file) {
        throw new Error(downloadError?.message ?? "PDF konnte nicht geladen werden.");
      }

      const chunks = await extractKnowledgeChunksFromPdf(file);
      if (chunks.length === 0) {
        throw new Error("Die PDF enthält keinen extrahierbaren Text.");
      }

      for (let index = 0; index < chunks.length; index += CHUNK_UPLOAD_BATCH_SIZE) {
        const batch = chunks.slice(index, index + CHUNK_UPLOAD_BATCH_SIZE);
        const { error } = await supabase.functions.invoke("ingest-knowledge-base", {
          body: {
            book_key: book.book_key,
            phase: "seed",
            reset: index === 0,
            chunks: batch,
          },
        });

        if (error) throw error;
      }

      const { data, error } = await supabase.functions.invoke("ingest-knowledge-base", {
        body: {
          book_key: book.book_key,
          phase: "embed",
        },
      });

      if (error) throw error;

      return {
        ...(data ?? {}),
        total_chunks: chunks.length,
      };
    },
    onSuccess: (data: { done?: boolean; total_chunks?: number }) => {
      toast.success(
        data.done
          ? `Indexierung abgeschlossen — ${data.total_chunks ?? 0} Chunks.`
          : `Indexierung gestartet — ${data.total_chunks ?? 0} Chunks werden verarbeitet.`,
      );
      qc.invalidateQueries({ queryKey: ["knowledge-books"] });
    },
    onError: (e: Error) => toast.error(`Indexierung fehlgeschlagen: ${e.message}`),
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
                    <Button
                      variant="gold-outline"
                      size="sm"
                      disabled={!b.file_path || isProcessing || isUploading}
                      onClick={() => ingest.mutate(b)}
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                      {b.status === "ready" ? "Neu indexieren" : "Indexieren"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-12 border-t border-border/20 pt-6 text-xs text-muted-foreground font-mono-label">
          <p>
            Hinweis: Die PDF wird im Admin-Browser in Text-Chunks zerlegt. Der Backend-Worker erzeugt danach nur noch die 3072-dimensionalen Embeddings via google/gemini-embedding-001.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminKnowledge;