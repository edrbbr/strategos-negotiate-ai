import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowLeft, BookOpen, Upload, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

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

function useBooks() {
  return useQuery({
    queryKey: ["knowledge-books"],
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase
        .from("knowledge_books")
        .select("*")
        .order("title");
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

  const ingest = useMutation({
    mutationFn: async (book_key: string) => {
      const { data, error } = await supabase.functions.invoke("ingest-knowledge-base", {
        body: { book_key },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: { chunks?: number }) => {
      toast.success(`Indexierung abgeschlossen — ${data?.chunks ?? 0} Chunks.`);
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
        .update({ file_path: path, status: "uploaded", error_message: null })
        .eq("book_key", book.book_key);
      if (dbErr) throw dbErr;
      toast.success(`„${book.title}" hochgeladen. Jetzt indexieren.`);
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
          <h1 className="font-serif text-4xl md:text-5xl">Verhandlungs-Bibliothek</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Lade Buch-PDFs hoch und indexiere sie. Die ELITE-Pipeline retrievt vor jeder Analyse
            relevante Passagen aus diesen Quellen.
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
              const isIngesting = b.status === "indexing" || (ingest.isPending && ingest.variables === b.book_key);
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
                        const f = e.target.files?.[0];
                        if (f) handleUpload(b, f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputs.current[b.book_key]?.click()}
                      disabled={isUploading || isIngesting}
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                      {b.file_path ? "PDF ersetzen" : "PDF hochladen"}
                    </Button>
                    <Button
                      variant="gold-outline"
                      size="sm"
                      disabled={!b.file_path || isIngesting || isUploading}
                      onClick={() => ingest.mutate(b.book_key)}
                    >
                      {isIngesting ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
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
            Hinweis: Die Indexierung erzeugt 3072-dimensionale Embeddings via google/gemini-embedding-001.
            Für ein durchschnittliches Buch (~300 Seiten) dauert der Vorgang 1–3 Minuten.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminKnowledge;