// Lightweight server-side conversion logger.
// Called from the frontend after meaningful conversion events that
// don't already go through a dedicated edge function (e.g. B2C signup).
// Stores rows in public.conversion_events for later attribution analysis.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EVENTS = new Set([
  "register",
  "b2b_lead",
  "checkout_success",
  "demo_request",
  "trial_start",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { event_name, properties, utm, referrer, email } = body ?? {};
    if (typeof event_name !== "string" || !ALLOWED_EVENTS.has(event_name)) {
      return new Response(JSON.stringify({ error: "invalid_event_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user from auth header when present (no failure if anonymous)
    let userId: string | null = null;
    let userEmail: string | null = typeof email === "string" ? email.slice(0, 200) : null;
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        userId = u.user.id;
        userEmail = userEmail ?? u.user.email ?? null;
      }
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await svc.from("conversion_events").insert({
      event_name,
      user_id: userId,
      email: userEmail,
      properties: (properties && typeof properties === "object") ? properties : {},
      utm: (utm && typeof utm === "object") ? utm : {},
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-conversion error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});