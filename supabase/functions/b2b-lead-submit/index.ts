import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { company_name, industry, contact_name, email, phone, store_count, message, utm, referrer } = body ?? {};
    if (!company_name || !industry || !contact_name || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const u = (utm && typeof utm === "object") ? utm as Record<string, unknown> : {};
    const pick = (k: string) => (typeof u[k] === "string" ? String(u[k]).slice(0, 200) : null);
    const { data, error } = await sb.from("b2b_leads").insert({
      company_name: String(company_name).slice(0, 200),
      industry: String(industry).slice(0, 100),
      contact_name: String(contact_name).slice(0, 150),
      email: String(email).slice(0, 200),
      phone: phone ? String(phone).slice(0, 50) : null,
      store_count: store_count ? String(store_count).slice(0, 50) : null,
      message: message ? String(message).slice(0, 4000) : null,
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_term: pick("utm_term"),
      utm_content: pick("utm_content"),
      gclid: pick("gclid"),
      fbclid: pick("fbclid"),
      referrer: typeof referrer === "string" ? referrer.slice(0, 500) : null,
    }).select("id").single();
    if (error) {
      console.error("lead insert", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side conversion event (best-effort, never blocks lead success)
    try {
      await sb.from("conversion_events").insert({
        event_name: "b2b_lead",
        email: String(email).slice(0, 200),
        properties: { industry: String(industry).slice(0, 100), company_name: String(company_name).slice(0, 200), lead_id: data.id },
        utm: u,
        user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      });
    } catch (logErr) {
      console.warn("conversion_events insert failed:", logErr);
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});