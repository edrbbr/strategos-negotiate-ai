import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const EMBED_MODEL = "google/gemini-embedding-001";

function chunk(text: string, size = 1200, overlap = 200): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}
function vec(v: number[]) { return `[${v.join(",")}]`; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { policy_id } = await req.json();
    if (!policy_id) return new Response(JSON.stringify({ error: "missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pol } = await svc.from("business_policies").select("*").eq("id", policy_id).single();
    if (!pol) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: mem } = await svc.from("business_users").select("role").eq("auth_user_id", userRes.user.id).eq("business_account_id", pol.business_account_id).eq("status","active").maybeSingle();
    if (!mem || !["manager","leitung"].includes(mem.role)) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await svc.from("business_policies").update({ status: "processing" }).eq("id", policy_id);
    await svc.from("business_policy_chunks").delete().eq("policy_id", policy_id);

    const text = pol.content ?? "";
    if (!text.trim()) {
      await svc.from("business_policies").update({ status: "ready", chunk_count: 0 }).eq("id", policy_id);
      return new Response(JSON.stringify({ ok: true, chunks: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const chunks = chunk(text);
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    let inserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL, input: c }),
      });
      if (!embRes.ok) { console.warn("emb fail", await embRes.text()); continue; }
      const emb = (await embRes.json())?.data?.[0]?.embedding as number[];
      if (!emb || emb.length !== 3072) continue;
      await svc.from("business_policy_chunks").insert({
        business_account_id: pol.business_account_id, policy_id,
        chunk_index: i, content: c, embedding: vec(emb) as any,
      });
      inserted++;
    }
    await svc.from("business_policies").update({ status: "ready", chunk_count: inserted }).eq("id", policy_id);
    return new Response(JSON.stringify({ ok: true, chunks: inserted }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});