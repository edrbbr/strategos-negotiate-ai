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

// Self-invoke the same function to continue processing in a fresh CPU budget.
function scheduleNext(payload: Record<string, unknown>) {
  const url = `${SUPABASE_URL}/functions/v1/ingest-knowledge-base`;
  const p = fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      "x-internal-continue": "1",
    },
    body: JSON.stringify(payload),
  }).then((r) => r.text()).catch((e) => console.error("scheduleNext failed:", e));
  // @ts-ignore EdgeRuntime is provided by Supabase
  try { EdgeRuntime.waitUntil(p); } catch { /* ignore */ }
}

// Phase 1: download PDF, extract text, chunk, insert chunks with NULL embedding.
async function phaseExtract(bookKey: string): Promise<{ total: number }> {
  const { data: book, error: bookErr } = await admin
    .from("knowledge_books")
    .select("*")
    .eq("book_key", bookKey)
    .single();
  if (bookErr || !book) throw new Error(`Book not found: ${bookKey}`);
  if (!book.file_path) throw new Error(`Book has no file_path. Upload PDF first.`);

  await admin.from("knowledge_books").update({ status: "indexing", error_message: null, chunk_count: 0 }).eq("book_key", bookKey);

  const { data: file, error: dlErr } = await admin.storage.from("knowledge-base").download(book.file_path);
  if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message}`);
  const buf = new Uint8Array(await file.arrayBuffer());

  const pdf = await getDocumentProxy(buf);
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const pageTexts = Array.isArray(pages) ? pages : [String(pages)];

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

  // Replace existing chunks
  await admin.from("knowledge_chunks").delete().eq("book_key", bookKey);

  // Insert all chunks WITHOUT embeddings (NULL). Bulk insert in DB-sized batches.
  const DB_BATCH = 200;
  for (let i = 0; i < chunks.length; i += DB_BATCH) {
    const slice = chunks.slice(i, i + DB_BATCH).map((c) => ({
      book_key: c.book_key,
      page: c.page,
      chapter: c.chapter,
      chunk_index: c.chunk_index,
      content: c.content,
      embedding: null,
    }));
    const { error: insErr } = await admin.from("knowledge_chunks").insert(slice);
    if (insErr) throw new Error(`Insert chunks: ${insErr.message}`);
  }

  return { total: chunks.length };
}

// Phase 2: take up to EMBED_BATCHES_PER_INVOCATION * EMBED_BATCH pending chunks, embed, then continue.
async function phaseEmbed(bookKey: string): Promise<{ done: boolean; processed: number; remaining: number }> {
  let processedThisCall = 0;
  for (let b = 0; b < EMBED_BATCHES_PER_INVOCATION; b++) {
    const { data: pending, error: selErr } = await admin
      .from("knowledge_chunks")
      .select("id, content")
      .eq("book_key", bookKey)
      .is("embedding", null)
      .order("chunk_index", { ascending: true })
      .limit(EMBED_BATCH);
    if (selErr) throw new Error(`Select pending: ${selErr.message}`);
    if (!pending || pending.length === 0) break;

    const embeddings = await embedBatch(pending.map((r) => r.content as string));
    if (embeddings.length !== pending.length) {
      throw new Error(`Embedding count mismatch: got ${embeddings.length} expected ${pending.length}`);
    }
    for (let i = 0; i < pending.length; i++) {
      if (embeddings[i].length !== EMBED_DIMS) {
        throw new Error(`Bad embedding dim ${embeddings[i].length}, expected ${EMBED_DIMS}`);
      }
      const { error: upErr } = await admin
        .from("knowledge_chunks")
        .update({ embedding: toVectorLiteral(embeddings[i]) })
        .eq("id", (pending[i] as { id: string }).id);
      if (upErr) throw new Error(`Update embedding: ${upErr.message}`);
    }
    processedThisCall += pending.length;
  }

  // Count remaining + total
  const [{ count: remaining }, { count: total }] = await Promise.all([
    admin.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("book_key", bookKey).is("embedding", null),
    admin.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("book_key", bookKey),
  ]);
  const done = (remaining ?? 0) === 0;
  const embedded = (total ?? 0) - (remaining ?? 0);

  if (done) {
    await admin
      .from("knowledge_books")
      .update({ status: "ready", chunk_count: total ?? 0, indexed_at: new Date().toISOString(), error_message: null })
      .eq("book_key", bookKey);
  } else {
    await admin
      .from("knowledge_books")
      .update({ chunk_count: embedded })
      .eq("book_key", bookKey);
  }

  return { done, processed: processedThisCall, remaining: remaining ?? 0 };
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