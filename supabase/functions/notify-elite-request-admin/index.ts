// Notifies the platform admin when a new elite request is created.
// Uses Lovable's transactional email infrastructure via send-transactional-email.
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "ender.babuer@outlook.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Best-effort fetch with small retry to absorb edge-runtime cold-start 503s.
async function sendWithRetry(url: string, init: RequestInit, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        await res.text().catch(() => "");
        return;
      }
      const body = await res.text().catch(() => "");
      console.error(`send-transactional-email attempt ${i + 1} failed ${res.status}`, body);
      if (res.status < 500 && res.status !== 429) return; // don't retry client errors
    } catch (e) {
      console.error(`send-transactional-email attempt ${i + 1} threw`, e);
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Gateway requires a real JWT. service-role is NOT a JWT under the new
    // signing-keys model and gets rejected with UNAUTHORIZED_INVALID_JWT_FORMAT.
    // The legacy anon key (a real signed JWT) is the only thing the gateway
    // accepts for unauthenticated server-to-server calls. Hardcode it here
    // because edge runtimes don't always inject SUPABASE_ANON_KEY.
    const ANON_JWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdnRucXh0c25wZ3lsbnZxY2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjIwMjIsImV4cCI6MjA5MjE5ODAyMn0.0LDUt5cuktSfvflcXDTSTCLHx8bRPJI4Ysq4nrUSDyc";
    console.log("env keys present:", {
      anon: !!Deno.env.get("SUPABASE_ANON_KEY"),
      pub: !!Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
      service: !!serviceKey,
    });

    const { user_email, full_name } = (await req.json().catch(() => ({}))) as {
      user_email?: string;
      full_name?: string;
    };

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: latest } = await supabase
      .from("elite_requests")
      .select(
        "id, full_name, email, profession, primary_use_case, monthly_negotiation_volume, biggest_pain_point, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const requestId = latest?.id ?? crypto.randomUUID();

    const sendInit: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_JWT}`,
        apikey: ANON_JWT,
      },
      body: JSON.stringify({
        templateName: "elite-request-admin",
        recipientEmail: ADMIN_EMAIL,
        idempotencyKey: `elite-admin-${requestId}`,
        templateData: {
          fullName: latest?.full_name ?? full_name ?? "—",
          email: latest?.email ?? user_email ?? "—",
          profession: latest?.profession ?? "—",
          primaryUseCase: latest?.primary_use_case ?? "—",
          monthlyVolume: latest?.monthly_negotiation_volume ?? "—",
          painPoint: latest?.biggest_pain_point ?? "—",
          adminUrl: "https://pallanx.com/admin",
        },
      }),
    };

    // Fire-and-forget — never block the user's elite-request submission on
    // the downstream email function (which can 503 on cold start).
    // @ts-expect-error EdgeRuntime is provided by the Supabase edge runtime
    EdgeRuntime.waitUntil(
      sendWithRetry(`${supabaseUrl}/functions/v1/send-transactional-email`, sendInit),
    );

    return json({ ok: true, queued: true });
  } catch (e) {
    console.error("notify-elite-request-admin error", e);
    return json({ error: String(e) }, 500);
  }
});