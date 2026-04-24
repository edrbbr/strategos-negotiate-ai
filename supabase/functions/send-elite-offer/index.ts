// Sends the personalized Elite invitation email to the requester (admin-triggered).
// Marks the elite_request as sent. Uses Lovable's transactional email infra.
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerUserId = claims.claims.sub;

    const admin = createClient(supabaseUrl, serviceKey);
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

    const monthlyUrl = `https://pallanx.com/preise?elite=monthly&token=${er.id}`;
    const yearlyUrl = `https://pallanx.com/preise?elite=yearly&token=${er.id}`;

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
          templateName: "elite-offer",
          recipientEmail: er.email,
          idempotencyKey: `elite-offer-${er.id}`,
          templateData: {
            fullName: er.full_name,
            profession: er.profession ?? "",
            monthlyUrl,
            yearlyUrl,
          },
        }),
      },
    );

    if (!invokeRes.ok) {
      const t = await invokeRes.text();
      console.error("send-transactional-email failed", invokeRes.status, t);
      return json({ ok: false, status: invokeRes.status, detail: t }, 502);
    }

    await admin
      .from("elite_requests")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", er.id);

    return json({ ok: true });
  } catch (e) {
    console.error("send-elite-offer error", e);
    return json({ error: String(e) }, 500);
  }
});