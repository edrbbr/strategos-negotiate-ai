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

    const { email, full_name, role, temp_password } = await req.json();
    if (!email || !full_name || !role || !temp_password) return new Response(JSON.stringify({ error: "missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!["sachbearbeiter","manager","leitung","support_readonly"].includes(role)) return new Response(JSON.stringify({ error: "invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: caller } = await svc.from("business_users").select("business_account_id, role").eq("auth_user_id", userRes.user.id).eq("status","active").maybeSingle();
    if (!caller) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (roleRank[caller.role] < 2) return new Response(JSON.stringify({ error: "manager_or_higher_required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (roleRank[role] > roleRank[caller.role]) return new Response(JSON.stringify({ error: "cannot_invite_higher" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create or find auth user
    let authUserId: string | null = null;
    const { data: created, error: cErr } = await svc.auth.admin.createUser({
      email, password: temp_password, email_confirm: true,
      user_metadata: { full_name },
    });
    if (cErr) {
      // maybe user exists — look up
      const { data: list } = await svc.auth.admin.listUsers();
      const found = list?.users?.find((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (!found) return new Response(JSON.stringify({ error: cErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      authUserId = found.id;
    } else {
      authUserId = created.user?.id ?? null;
    }
    if (!authUserId) return new Response(JSON.stringify({ error: "auth_user_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error: insErr } = await svc.from("business_users").insert({
      business_account_id: caller.business_account_id, auth_user_id: authUserId,
      full_name, email, role, status: "active",
    });
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});