// Sends the personalized Elite invitation email to the requester (admin-triggered).
// Marks the elite_request as sent.
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerUserId = claims.claims.sub;

    // Verify caller is admin
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId);
    if (!roles?.some((r) => r.role === "admin")) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as { request_id?: string };
    if (!body.request_id) return json({ error: "Missing request_id" }, 400);

    const { data: er, error: erErr } = await admin
      .from("elite_requests")
      .select("id, full_name, email, profession, primary_use_case, status")
      .eq("id", body.request_id)
      .maybeSingle();
    if (erErr || !er) return json({ error: "Request not found" }, 404);

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return json({ error: "Email infrastructure not configured. Bitte zuerst Email-Domain pallanx.com verifizieren." }, 503);
    }

    const monthlyUrl = `https://pallanx.com/preise?elite=monthly&token=${er.id}`;
    const yearlyUrl = `https://pallanx.com/preise?elite=yearly&token=${er.id}`;

    const html = `
      <div style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#1a1a1a;background:#fafafa;padding:48px 32px">
        <h1 style="color:#a4863e;font-weight:300;font-style:italic;font-size:32px;margin:0 0 8px">PALLANX</h1>
        <p style="color:#999;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 32px">Imperialer Zugang — Persönliche Einladung</p>

        <p style="font-size:16px;line-height:1.7">${er.full_name},</p>

        <p style="font-size:16px;line-height:1.7">
          Ihre Anfrage wurde geprüft. Auf Basis Ihres Profils
          <em>(${er.profession})</em> bieten wir Ihnen den Zugang zu PALLANX <strong>Imperial</strong> an —
          dem höchsten Tier, das nur nach persönlicher Eignungsprüfung vergeben wird.
        </p>

        <div style="background:#fff;border-left:3px solid #a4863e;padding:24px;margin:32px 0;font-family:Arial,sans-serif">
          <p style="margin:0 0 12px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Was Sie erhalten</p>
          <ul style="margin:0;padding-left:20px;line-height:1.9;font-size:14px">
            <li><strong>Multi-Stage-KI-Pipeline</strong> — spezialisierte Modelle in jeder Verhandlungsphase</li>
            <li><strong>Unbegrenzte Dossiers</strong> — kein Monatszähler, keine Drosselung</li>
            <li><strong>Maximale Tiefe</strong> — psychologische Profile, Gegnerprognose, mehrstufige Strategien</li>
            <li><strong>Persönlicher Onboarding</strong> — direkter Kontakt zum Team</li>
            <li><strong>Priority Support</strong> — Antwort innerhalb von 4 Stunden</li>
          </ul>
        </div>

        <p style="font-size:14px;line-height:1.7;color:#a4863e;font-style:italic">
          Dieses Angebot ist befristet auf 7 Tage und nicht übertragbar.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:32px 0">
          <tr>
            <td style="padding:8px 8px 8px 0;width:50%">
              <a href="${monthlyUrl}" style="display:block;background:transparent;color:#a4863e;border:1px solid #a4863e;padding:18px 24px;text-decoration:none;text-align:center;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px">
                <span style="display:block;font-size:11px;text-transform:uppercase;color:#666;margin-bottom:6px">Monatlich</span>
                <strong>Imperial monatlich</strong>
              </a>
            </td>
            <td style="padding:8px 0 8px 8px;width:50%">
              <a href="${yearlyUrl}" style="display:block;background:#a4863e;color:#fff;padding:18px 24px;text-decoration:none;text-align:center;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px">
                <span style="display:block;font-size:11px;text-transform:uppercase;color:#fff;margin-bottom:6px;opacity:.8">Empfohlen — 2 Monate gratis</span>
                <strong>Imperial jährlich</strong>
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size:13px;color:#666;line-height:1.7;margin-top:40px">
          Bei Fragen antworten Sie einfach auf diese E-Mail. Wir melden uns binnen 24 Stunden.
        </p>

        <hr style="border:none;border-top:1px solid #e5e5e5;margin:40px 0 16px"/>
        <p style="color:#999;font-size:11px;font-family:Arial,sans-serif;text-align:center;margin:0">
          PALLANX — Imperiales Verhandlungssystem<br/>
          Diese Einladung wurde persönlich für Sie erstellt.
        </p>
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
        to: [er.email],
        subject: `${er.full_name}, Ihr persönlicher Imperialer Zugang ist freigegeben`,
        html,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("Resend send failed", r.status, t);
      return json({ ok: false, status: r.status, detail: t }, 502);
    }

    await admin
      .from("elite_requests")
      .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", er.id);

    return json({ ok: true });
  } catch (e) {
    console.error("send-elite-offer error", e);
    return json({ error: String(e) }, 500);
  }
});
