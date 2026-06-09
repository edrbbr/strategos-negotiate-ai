import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { account_id, ordered_ids } = await req.json();
    if (!account_id || !Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return new Response(JSON.stringify({ error: "missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: canManage } = await svc.rpc("can_manage_roles", { _user: userRes.user.id, _account: account_id });
    if (!canManage) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: rows } = await svc.from("business_custom_roles").select("id, base_role, is_builtin, max_discount_percent").eq("business_account_id", account_id);
    if (!rows || rows.length !== ordered_ids.length) {
      return new Response(JSON.stringify({ error: "ordered_ids_mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const rowMap = new Map(rows.map((r: any) => [r.id, r]));
    for (const id of ordered_ids) if (!rowMap.has(id)) return new Response(JSON.stringify({ error: "unknown_role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Leitung must remain top (index 0)
    const top = rowMap.get(ordered_ids[0]);
    if (top?.is_builtin && top?.base_role === "leitung") {
      // ok
    } else {
      // Reject if any other position contains leitung builtin
      const leitungIdx = ordered_ids.findIndex((id) => { const r = rowMap.get(id); return r?.is_builtin && r?.base_role === "leitung"; });
      if (leitungIdx !== -1) return new Response(JSON.stringify({ error: "leitung_must_be_top" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate monotonicity given the new order: limits must be non-increasing top→bottom
    let prev = Number.POSITIVE_INFINITY;
    for (const id of ordered_ids) {
      const r: any = rowMap.get(id);
      if (Number(r.max_discount_percent) > prev) {
        return new Response(JSON.stringify({ error: "rank_limit_violation", message: "Rabatt-Limits müssen mit Hierarchie absteigen. Bitte Limits anpassen." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      prev = Number(r.max_discount_percent);
    }

    // Assign new ranks descending: top gets N*10, bottom gets 10
    const N = ordered_ids.length;
    // Two-step to avoid unique conflicts: first move to high temp range, then to final
    for (let i = 0; i < N; i++) {
      const tempRank = 100000 + i;
      const { error } = await svc.from("business_custom_roles").update({ rank: tempRank }).eq("id", ordered_ids[i]);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    for (let i = 0; i < N; i++) {
      const finalRank = (N - i) * 10;
      const { error } = await svc.from("business_custom_roles").update({ rank: finalRank }).eq("id", ordered_ids[i]);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});