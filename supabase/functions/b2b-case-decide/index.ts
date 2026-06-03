import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const roleRank: Record<string, number> = { support_readonly: 0, sachbearbeiter: 1, manager: 2, leitung: 3 };

// Direct decision (no escalation): user closes case within their own role limit.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userRes.user.id;

    const { case_id, final_amount, final_percent, notes } = await req.json();
    if (!case_id) return new Response(JSON.stringify({ error: "missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: c } = await svc.from("business_cases").select("*").eq("id", case_id).single();
    if (!c) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: mem } = await svc.from("business_users").select("role").eq("auth_user_id", userId).eq("business_account_id", c.business_account_id).eq("status","active").maybeSingle();
    if (!mem) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: settings } = await svc.from("business_settings").select("max_discount_limits").eq("business_account_id", c.business_account_id).maybeSingle();
    const limits = (settings?.max_discount_limits ?? {}) as Record<string, number>;
    const myMax = mem.role === "leitung" ? (limits.leitung_max_percent ?? 100)
      : mem.role === "manager" ? (limits.manager_max_percent ?? 25)
      : (limits.sachbearbeiter_max_percent ?? 10);
    const pct = Number(final_percent) || 0;
    if (pct > myMax) return new Response(JSON.stringify({ error: "exceeds_limit", limit: myMax }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await svc.from("business_cases").update({
      status: "closed", final_granted_amount: Number(final_amount) || 0,
      final_granted_percent: pct, closed_at: new Date().toISOString(),
    }).eq("id", case_id);

    await svc.from("business_case_logs").insert({
      case_id, business_account_id: c.business_account_id, user_id: userId,
      action: "direct_decision", approval_role_used: mem.role,
      chosen_option: { amount: final_amount, percent: pct, notes },
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});