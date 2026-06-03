import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin-side: create a B2B account (optionally with a primary leitung user).
// Requires the caller to have the platform 'admin' role.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify admin role
    const { data: roleRow } = await svc.from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "admin_required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const {
      company_name, industry, store_count, billing_email,
      monthly_fee_cents,
      primary_contact_email, primary_contact_name, primary_contact_temp_password,
    } = body ?? {};

    if (!company_name || !billing_email) {
      return new Response(JSON.stringify({ error: "missing_required_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing_email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert account
    const { data: acc, error: accErr } = await svc.from("business_accounts").insert({
      name: String(company_name).slice(0, 200),
      industry: industry ? String(industry).slice(0, 100) : null,
      store_count: store_count ? Number(store_count) : null,
      billing_email: String(billing_email).slice(0, 200),
    }).select("id").single();
    if (accErr) throw accErr;

    await svc.from("business_settings").insert({ business_account_id: acc.id });
    await svc.from("business_billing").insert({
      business_account_id: acc.id,
      billing_model: "invoice",
      monthly_fee_cents: monthly_fee_cents ? Number(monthly_fee_cents) : 0,
    });

    // Optionally provision a primary leitung user
    let primary_user_id: string | null = null;
    if (primary_contact_email && primary_contact_name && primary_contact_temp_password) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primary_contact_email)) {
        return new Response(JSON.stringify({ error: "invalid_primary_email", business_account_id: acc.id }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      let authUserId: string | null = null;
      const { data: created, error: cErr } = await svc.auth.admin.createUser({
        email: primary_contact_email,
        password: primary_contact_temp_password,
        email_confirm: true,
        user_metadata: { full_name: primary_contact_name },
      });
      if (cErr) {
        const { data: list } = await svc.auth.admin.listUsers();
        const found = list?.users?.find((u: any) => u.email?.toLowerCase() === String(primary_contact_email).toLowerCase());
        if (!found) return new Response(JSON.stringify({ error: cErr.message, business_account_id: acc.id }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        authUserId = found.id;
      } else {
        authUserId = created.user?.id ?? null;
      }
      if (authUserId) {
        await svc.from("business_users").insert({
          business_account_id: acc.id,
          auth_user_id: authUserId,
          full_name: String(primary_contact_name).slice(0, 200),
          email: String(primary_contact_email).slice(0, 200),
          role: "leitung",
          is_primary_contact: true,
          status: "active",
        });
        primary_user_id = authUserId;
      }
    }

    return new Response(JSON.stringify({ ok: true, business_account_id: acc.id, primary_user_id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("b2b-admin-create-account error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});