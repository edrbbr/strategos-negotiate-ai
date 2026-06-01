import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
const EMBED_BATCH = 4;
const EMBED_BATCHES_PER_INVOCATION = 1;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface Chunk {
  book_key: string;
  page: number;
  chapter: string | null;
  chunk_index: number;
  content: string;
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

async function phaseSeed(bookKey: string, chunks: Chunk[], reset: boolean): Promise<{ total: number }> {
  const { data: book, error: bookErr } = await admin
    .from("knowledge_books")
    .select("book_key, file_path")
    .eq("book_key", bookKey)
    .single();

  if (bookErr || !book) throw new Error(`Book not found: ${bookKey}`);
  if (!book.file_path) throw new Error("Book has no file_path. Upload PDF first.");
  if (!Array.isArray(chunks) || chunks.length === 0) throw new Error("chunks required for seed phase.");

  if (reset) {
    await admin
      .from("knowledge_books")
      .update({ status: "indexing", error_message: null, chunk_count: 0, indexed_at: null })
      .eq("book_key", bookKey);

    const { error: deleteError } = await admin.from("knowledge_chunks").delete().eq("book_key", bookKey);
    if (deleteError) throw new Error(`Delete existing chunks: ${deleteError.message}`);
  }

  const rows = chunks.map((chunk) => ({
    book_key: bookKey,
    page: chunk.page,
    chapter: chunk.chapter,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    embedding: null,
  }));

  const { error: insertError } = await admin.from("knowledge_chunks").insert(rows);
  if (insertError) throw new Error(`Insert chunks: ${insertError.message}`);

  const { count, error: countError } = await admin
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true })
    .eq("book_key", bookKey);

  if (countError) throw new Error(`Count chunks: ${countError.message}`);

  await admin.from("knowledge_books").update({ chunk_count: count ?? 0 }).eq("book_key", bookKey);

  return { total: count ?? rows.length };
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
      .update({
        status: "ready",
        chunk_count: total ?? 0,
        indexed_at: new Date().toISOString(),
        error_message: null,
        progress_phase: null,
        progress_done: total ?? 0,
        progress_total: total ?? 0,
        progress_updated_at: new Date().toISOString(),
      })
      .eq("book_key", bookKey);
  } else {
    await admin
      .from("knowledge_books")
      .update({
        chunk_count: embedded,
        progress_phase: "embedding",
        progress_done: embedded,
        progress_total: total ?? 0,
        progress_updated_at: new Date().toISOString(),
      })
      .eq("book_key", bookKey);
  }

  return { done, processed: processedThisCall, remaining: remaining ?? 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const bookKey = body.book_key as string | undefined;
    const phase = (body.phase as string | undefined) ?? "seed";
    const reset = body.reset === true;
    const chunks = Array.isArray(body.chunks) ? (body.chunks as Chunk[]) : [];
    const isInternal = req.headers.get("x-internal-continue") === "1";

    if (!bookKey) {
      return new Response(JSON.stringify({ error: "book_key required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin check only for user-initiated calls
    if (!isInternal) {
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
    }

    if (phase === "seed") {
      const { total } = await phaseSeed(bookKey, chunks, reset);
      return new Response(JSON.stringify({ ok: true, phase: "seed", total_chunks: total, status: "indexing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "embed") {
      const res = await phaseEmbed(bookKey);
      if (!res.done) {
        scheduleNext({ book_key: bookKey, phase: "embed" });
      }
      return new Response(JSON.stringify({ ok: true, phase: "embed", ...res }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "start") {
      const { count, error: countError } = await admin
        .from("knowledge_chunks")
        .select("id", { count: "exact", head: true })
        .eq("book_key", bookKey);
      if (countError) throw new Error(`Count chunks: ${countError.message}`);
      scheduleNext({ book_key: bookKey, phase: "embed" });
      return new Response(JSON.stringify({ ok: true, phase: "start", total_chunks: count ?? 0, status: "indexing" }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "cancel") {
      const { error: delErr } = await admin.from("knowledge_chunks").delete().eq("book_key", bookKey);
      if (delErr) throw new Error(`Delete chunks: ${delErr.message}`);
      await admin
        .from("knowledge_books")
        .update({
          status: "uploaded",
          chunk_count: 0,
          indexed_at: null,
          error_message: null,
          progress_phase: null,
          progress_done: 0,
          progress_total: 0,
          progress_updated_at: new Date().toISOString(),
        })
        .eq("book_key", bookKey);
      return new Response(JSON.stringify({ ok: true, phase: "cancel" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "delete") {
      // 1. Delete all embeddings/chunks
      const { error: delChunks } = await admin.from("knowledge_chunks").delete().eq("book_key", bookKey);
      if (delChunks) throw new Error(`Delete chunks: ${delChunks.message}`);

      // 2. Delete the PDF from storage if present
      const { data: bookRow } = await admin.from("knowledge_books").select("file_path").eq("book_key", bookKey).maybeSingle();
      if (bookRow?.file_path) {
        await admin.storage.from("knowledge-base").remove([bookRow.file_path]);
      }

      // 3. Delete the book row
      const { error: delBook } = await admin.from("knowledge_books").delete().eq("book_key", bookKey);
      if (delBook) throw new Error(`Delete book: ${delBook.message}`);

      return new Response(JSON.stringify({ ok: true, phase: "delete" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "status") {
      const [{ count: total }, { count: pending }] = await Promise.all([
        admin.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("book_key", bookKey),
        admin.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("book_key", bookKey).is("embedding", null),
      ]);
      const t = total ?? 0;
      const p = pending ?? 0;
      return new Response(JSON.stringify({ ok: true, phase: "status", total: t, embedded: t - p, pending: p }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown phase: ${phase}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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