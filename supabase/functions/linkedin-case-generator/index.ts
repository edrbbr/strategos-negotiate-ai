// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Admin-only edge function. Body: { pool_id: string, template_key: string }
 *
 * Steps:
 *  1. Verify caller has admin role.
 *  2. Load the linkedin_pool row + linked case.
 *  3. Use Lovable AI to (a) anonymize situation/outcome and
 *     (b) generate a LinkedIn post in the chosen template style.
 *  4. Persist anonymized_situation/outcome, generated_post, template_key,
 *     status='generated' on the pool row.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Admin check
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const pool_id = String(body?.pool_id ?? "");
    const template_key = String(body?.template_key ?? "");
    if (!pool_id || !template_key) {
      return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: pool, error: poolErr } = await admin
      .from("linkedin_pool")
      .select("id, case_id, user_consent, status")
      .eq("id", pool_id)
      .maybeSingle();
    if (poolErr || !pool) {
      return new Response(JSON.stringify({ error: "pool_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!pool.user_consent) {
      return new Response(JSON.stringify({ error: "no_consent" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: caseRow } = await admin
      .from("cases")
      .select("situation_text, analysis, strategy, draft, title")
      .eq("id", pool.case_id)
      .maybeSingle();
    if (!caseRow) {
      return new Response(JSON.stringify({ error: "case_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: template } = await admin
      .from("linkedin_templates")
      .select("prompt_skeleton, label")
      .eq("key", template_key)
      .maybeSingle();
    if (!template) {
      return new Response(JSON.stringify({ error: "template_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const casePayload = JSON.stringify({
      situation: caseRow.situation_text,
      analysis: caseRow.analysis,
      strategy: caseRow.strategy,
      draft: caseRow.draft,
    });

    const systemPrompt = `Du bist ein Senior-Content-Stratege für PALLANX (Verhandlungs-Co-Pilot für Selbstständige im DACH-Raum).
Du arbeitest in zwei Schritten:
1) ANONYMISIERUNG: Entferne alle Klarnamen, Firmen, Orte, identifizierbaren Zahlen und ersetze sie durch generische Platzhalter (z. B. "ein Bestandskunde", "ein Tech-Startup", "ein mittlerer fünfstelliger Betrag"). Branche darf maximal als grobe Kategorie bleiben.
2) POST: Schreibe basierend auf dem anonymisierten Material einen LinkedIn-Post nach folgender Vorgabe:
${template.prompt_skeleton}

Stilregeln:
- Deutsch, du-Form, ruhig und souverän, niemals reisserisch.
- Keine generischen Floskeln wie "Game-Changer", "absolut", "unglaublich".
- Eine Beobachtung > drei Behauptungen.
- PALLANX nur dezent erwähnen, höchstens einmal.

Antworte ausschließlich als JSON mit den Feldern:
{
  "anonymized_situation": "...",
  "anonymized_outcome": "...",
  "post": "..."
}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Verhandlungs-Material (Roh):\n\n${casePayload}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "ai_error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { /* keep empty */ }

    const update = {
      template_key,
      anonymized_situation: parsed.anonymized_situation ?? null,
      anonymized_outcome: parsed.anonymized_outcome ?? null,
      generated_post: parsed.post ?? null,
      status: "generated",
      curated_by: callerId,
      curated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await admin
      .from("linkedin_pool")
      .update(update)
      .eq("id", pool_id);
    if (updateErr) {
      console.error("update error", updateErr);
      return new Response(JSON.stringify({ error: "db_error", details: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, ...update }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("linkedin-case-generator", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});