import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Self-service B2B registration: user already signed up via supabase.auth.
// This creates business_account + business_user (leitung, primary) + business_settings + business_billing.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const user = userRes.user;

    const { company_name, industry, store_count, full_name } = await req.json();
    if (!company_name || !full_name) return new Response(JSON.stringify({ error: "missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Already a B2B user?
    const { data: existing } = await svc.from("business_users").select("business_account_id").eq("auth_user_id", user.id).maybeSingle();
    if (existing) return new Response(JSON.stringify({ ok: true, business_account_id: existing.business_account_id, existed: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: acc, error: accErr } = await svc.from("business_accounts").insert({
      name: String(company_name).slice(0, 200),
      industry: industry ? String(industry).slice(0, 100) : null,
      store_count: store_count ? Number(store_count) : null,
      billing_email: user.email!,
    }).select("id").single();
    if (accErr) throw accErr;

    await svc.from("business_users").insert({
      business_account_id: acc.id, auth_user_id: user.id,
      full_name: String(full_name).slice(0, 200), email: user.email!,
      role: "leitung", is_primary_contact: true, status: "active",
    });
    await svc.from("business_settings").insert({ business_account_id: acc.id });
    await svc.from("business_billing").insert({ business_account_id: acc.id, billing_model: "invoice" });

    return new Response(JSON.stringify({ ok: true, business_account_id: acc.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});