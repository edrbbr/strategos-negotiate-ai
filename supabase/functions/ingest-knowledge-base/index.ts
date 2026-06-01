import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const EMBED_MODEL = "google/gemini-embedding-001";
const EMBED_DIMS = 3072;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBED_BATCH = 8;
const EMBED_BATCHES_PER_INVOCATION = 2; // small to stay under CPU limit

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface Chunk {
  book_key: string;
  page: number;
  chapter: string | null;
  chunk_index: number;
  content: string;
}

function chunkPageText(pageText: string, page: number, startIndex: number, bookKey: string, currentChapter: string | null): { chunks: Chunk[]; chapter: string | null } {
  const out: Chunk[] = [];
  let chapter = currentChapter;
  const lines = pageText.split(/\r?\n/);
  // naive chapter heuristic: line that matches "Chapter N" or is fully uppercase short
  for (const line of lines.slice(0, 5)) {
    const t = line.trim();
    if (/^(chapter|kapitel|law)\s+\d+/i.test(t) || (t.length > 3 && t.length < 60 && t === t.toUpperCase() && /[A-Z]/.test(t))) {
      chapter = t.slice(0, 80);
      break;
    }
  }
  const clean = pageText.replace(/\s+/g, " ").trim();
  if (!clean) return { chunks: out, chapter };
  let i = 0;
  let idx = startIndex;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    const content = clean.slice(i, end).trim();
    if (content.length > 80) {
      out.push({ book_key: bookKey, page, chapter, chunk_index: idx, content });
      idx++;
    }
    if (end >= clean.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return { chunks: out, chapter };
}

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embedding API ${res.status}: ${text}`);
  }
  const json = await res.json();
  return (json.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}

function toVectorLiteral(v: number[]): string {
  // pgvector literal text format: [0.1,0.2,...]
  return `[${v.join(",")}]`;
}

async function ingestBook(bookKey: string): Promise<{ chunks: number }> {
  // 1. Load book row
  const { data: book, error: bookErr } = await admin
    .from("knowledge_books")
    .select("*")
    .eq("book_key", bookKey)
    .single();
  if (bookErr || !book) throw new Error(`Book not found: ${bookKey}`);
  if (!book.file_path) throw new Error(`Book has no file_path. Upload PDF first.`);

  await admin.from("knowledge_books").update({ status: "indexing", error_message: null }).eq("book_key", bookKey);

  // 2. Download PDF
  const { data: file, error: dlErr } = await admin.storage.from("knowledge-base").download(book.file_path);
  if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message}`);
  const buf = new Uint8Array(await file.arrayBuffer());

  // 3. Extract text per page
  const pdf = await getDocumentProxy(buf);
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const pageTexts = Array.isArray(pages) ? pages : [String(pages)];

  // 4. Chunk
  const chunks: Chunk[] = [];
  let chapter: string | null = null;
  let chunkIdx = 0;
  for (let p = 0; p < pageTexts.length; p++) {
    const result = chunkPageText(pageTexts[p], p + 1, chunkIdx, bookKey, chapter);
    chunks.push(...result.chunks);
    chapter = result.chapter;
    chunkIdx += result.chunks.length;
  }

  if (chunks.length === 0) throw new Error("No extractable text in PDF.");

  // 5. Delete existing chunks (re-index case)
  await admin.from("knowledge_chunks").delete().eq("book_key", bookKey);

  // 6. Embed + insert in batches
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const embeddings = await embedBatch(batch.map((c) => c.content));
    if (embeddings.length !== batch.length) {
      throw new Error(`Embedding count mismatch: got ${embeddings.length} expected ${batch.length}`);
    }
    const rows = batch.map((c, j) => {
      if (embeddings[j].length !== EMBED_DIMS) {
        throw new Error(`Bad embedding dim ${embeddings[j].length}, expected ${EMBED_DIMS}`);
      }
      return {
        book_key: c.book_key,
        page: c.page,
        chapter: c.chapter,
        chunk_index: c.chunk_index,
        content: c.content,
        embedding: toVectorLiteral(embeddings[j]),
      };
    });
    const { error: insErr } = await admin.from("knowledge_chunks").insert(rows);
    if (insErr) throw new Error(`Insert chunks: ${insErr.message}`);
    inserted += rows.length;

    // Progress update every batch
    await admin
      .from("knowledge_books")
      .update({ chunk_count: inserted })
      .eq("book_key", bookKey);
  }

  await admin
    .from("knowledge_books")
    .update({ status: "ready", chunk_count: inserted, indexed_at: new Date().toISOString(), error_message: null })
    .eq("book_key", bookKey);

  return { chunks: inserted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const bookKey = body.book_key as string | undefined;
    if (!bookKey) {
      return new Response(JSON.stringify({ error: "book_key required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await ingestBook(bookKey);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ingest-knowledge-base error:", msg);
    // Mark book as errored if possible
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.book_key) {
        await admin.from("knowledge_books").update({ status: "error", error_message: msg.slice(0, 500) }).eq("book_key", body.book_key);
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});