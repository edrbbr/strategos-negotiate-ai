import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const roleRank: Record<string, number> = { support_readonly: 0, sachbearbeiter: 1, manager: 2, leitung: 3 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userRes.user.id;

    const { approval_id, decision, final_amount, final_percent, notes } = await req.json();
    if (!approval_id || !decision) return new Response(JSON.stringify({ error: "missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!["accepted","modified","rejected"].includes(decision)) return new Response(JSON.stringify({ error: "invalid decision" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: appr } = await svc.from("business_approvals").select("*").eq("id", approval_id).single();
    if (!appr) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: mem } = await svc.from("business_users").select("role").eq("auth_user_id", userId).eq("business_account_id", appr.business_account_id).eq("status","active").maybeSingle();
    if (!mem) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (roleRank[mem.role] < roleRank[appr.required_role]) return new Response(JSON.stringify({ error: "insufficient_role" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const amount = decision === "rejected" ? 0 : (Number(final_amount) || appr.requested_amount);
    const percent = decision === "rejected" ? 0 : (Number(final_percent) || appr.requested_percent);

    await svc.from("business_approvals").update({
      status: decision, decided_by_user_id: userId, decided_at: new Date().toISOString(),
      decision_notes: notes ?? null, final_amount: amount, final_percent: percent,
    }).eq("id", approval_id);

    const caseUpdate: any = {};
    if (decision === "rejected") {
      caseUpdate.status = "rejected";
      caseUpdate.final_granted_amount = 0;
      caseUpdate.final_granted_percent = 0;
      caseUpdate.closed_at = new Date().toISOString();
    } else {
      caseUpdate.status = "closed";
      caseUpdate.final_granted_amount = amount;
      caseUpdate.final_granted_percent = percent;
      caseUpdate.closed_at = new Date().toISOString();
    }
    await svc.from("business_cases").update(caseUpdate).eq("id", appr.case_id);
    await svc.from("business_case_logs").insert({
      case_id: appr.case_id, business_account_id: appr.business_account_id, user_id: userId,
      action: `approval_${decision}`, approval_role_used: mem.role,
      chosen_option: { amount, percent, notes },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});