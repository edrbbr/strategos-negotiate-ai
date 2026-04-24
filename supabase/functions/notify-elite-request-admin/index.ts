// Sends a notification email to the platform admin when a new elite request comes in.
// Uses the Lovable Emails infrastructure (via Resend, gated by Lovable Email Domain).
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "ender.babuer@gmail.com";
const FROM_EMAIL = "PALLANX <noreply@pallanx.com>";

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
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.warn("RESEND_API_KEY missing — email skipped");
      return json({ skipped: true, reason: "email_not_configured" });
    }

    const { user_email, full_name } = (await req.json().catch(() => ({}))) as {
      user_email?: string;
      full_name?: string;
    };

    // Fetch most recent pending request for context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: latest } = await supabase
      .from("elite_requests")
      .select("id, full_name, email, profession, primary_use_case, monthly_negotiation_volume, biggest_pain_point, admin_token, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const adminUrl = `https://pallanx.com/admin`;

    const html = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1a1a1a">
        <h2 style="color:#a4863e;font-weight:400">Neue Elite-Anfrage</h2>
        <p>Eine neue Anfrage wurde im Imperialen System eingereicht.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-family:Arial,sans-serif;font-size:14px">
          <tr><td style="padding:6px 0;color:#666">Name</td><td>${latest?.full_name ?? full_name ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">E-Mail</td><td>${latest?.email ?? user_email ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Beruf</td><td>${latest?.profession ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Use Case</td><td>${latest?.primary_use_case ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Volumen</td><td>${latest?.monthly_negotiation_volume ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666;vertical-align:top">Bedarf</td><td>${latest?.biggest_pain_point ?? "—"}</td></tr>
        </table>
        <p style="margin-top:24px">
          <a href="${adminUrl}" style="background:#a4863e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:2px;font-family:Arial,sans-serif;font-size:14px">
            Im Admin-Panel öffnen
          </a>
        </p>
        <p style="color:#999;font-size:12px;font-family:Arial,sans-serif;margin-top:32px">PALLANX Imperial System</p>
      </div>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `Neue Elite-Anfrage: ${latest?.full_name ?? full_name ?? "Unbekannt"}`,
        html,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("Resend send failed", r.status, t);
      return json({ ok: false, status: r.status }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("notify-elite-request-admin error", e);
    return json({ error: String(e) }, 500);
  }
});
