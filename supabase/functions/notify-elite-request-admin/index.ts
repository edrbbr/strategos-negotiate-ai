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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const invokeRes = await fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
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
      },
    );

    if (!invokeRes.ok) {
      const t = await invokeRes.text();
      console.error("send-transactional-email failed", invokeRes.status, t);
      return json({ ok: false, status: invokeRes.status, detail: t }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("notify-elite-request-admin error", e);
    return json({ error: String(e) }, 500);
  }
});