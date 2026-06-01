import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { KnowledgeSource } from "./types.ts";

const EMBED_MODEL = "google/gemini-embedding-001";
const EMBED_DIMS = 3072;
const TOP_K = 8;
const MAX_QUERY_CHARS = 6000;

function vectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/**
 * Retrieve relevant book passages for the given situation.
 * Returns both a formatted context string for the prompt and the raw source rows
 * for UI display + persistence. On any failure returns empty results — RAG is
 * additive, never blocking.
 */
export async function retrieveKnowledge(
  client: SupabaseClient,
  lovableKey: string | null,
  situationText: string,
  attachmentsContext: string,
): Promise<{ contextBlock: string; sources: KnowledgeSource[] }> {
  const empty = { contextBlock: "", sources: [] as KnowledgeSource[] };
  if (!lovableKey) return empty;

  try {
    const query = `${situationText}\n\n${attachmentsContext}`.slice(0, MAX_QUERY_CHARS);
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: query }),
    });
    if (!embRes.ok) {
      console.warn("Embedding failed", embRes.status, await embRes.text().catch(() => ""));
      return empty;
    }
    const embJson = await embRes.json();
    const embedding: number[] = embJson?.data?.[0]?.embedding ?? [];
    if (embedding.length !== EMBED_DIMS) {
      console.warn("Unexpected embedding dim", embedding.length);
      return empty;
    }

    const { data: matches, error } = await client.rpc("match_knowledge", {
      query_embedding: vectorLiteral(embedding),
      match_count: TOP_K,
      filter_books: null,
    });
    if (error) {
      console.warn("match_knowledge failed", error.message);
      return empty;
    }
    const rows = (matches ?? []) as Array<{
      id: string;
      book_key: string;
      book_title: string;
      chapter: string | null;
      page: number | null;
      content: string;
      similarity: number;
    }>;
    if (rows.length === 0) return empty;

    const sources: KnowledgeSource[] = rows.map((r) => ({
      book_key: r.book_key,
      book_title: r.book_title,
      chapter: r.chapter,
      page: r.page,
      snippet: r.content.slice(0, 300),
    }));

    const contextBlock = rows
      .map((r, i) => {
        const loc = [r.book_title, r.chapter, r.page ? `S. ${r.page}` : null]
          .filter(Boolean)
          .join(" · ");
        return `[${i + 1}] ${loc}\n"${r.content.trim()}"`;
      })
      .join("\n\n");

    return { contextBlock, sources };
  } catch (e) {
    console.warn("retrieveKnowledge error", e);
    return empty;
  }
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}