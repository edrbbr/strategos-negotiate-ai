// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAnthropicTool } from "../_shared/anthropic.ts";

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
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

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
    const mode = String(body?.mode ?? "generate");

    // ============ REFINE MODE ============
    if (mode === "refine") {
      const pool_id = String(body?.pool_id ?? "");
      const instruction = String(body?.refinement_instruction ?? "").trim();
      if (!pool_id || !instruction) {
        return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existing } = await admin
        .from("linkedin_pool")
        .select("id, generated_post, post_title, anonymized_situation, anonymized_outcome, refinement_history")
        .eq("id", pool_id)
        .maybeSingle();
      if (!existing || !existing.generated_post) {
        return new Response(JSON.stringify({ error: "post_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const refineSystem = `Du bist Senior-Content-Stratege für PALLANX. Du überarbeitest einen bestehenden LinkedIn-Post gemäss einer konkreten Anweisung.
Regeln:
- Deutsch, du-Form, ruhig und souverän. Keine reisserischen Floskeln.
- Anonymisierung muss erhalten bleiben (keine Klarnamen, Firmen, Orte oder identifizierbaren Zahlen einfügen).
- Halte dich an die Anweisung, ohne den Kern der Geschichte zu verfälschen.
- Liefere zusätzlich einen kurzen, sachlichen Titel (max ~80 Zeichen, ohne Clickbait).`;

      const refineUser = `Aktueller Titel: ${existing.post_title ?? "(noch keiner)"}

Aktueller Post:
${existing.generated_post}

Anonymisierte Situation (Kontext, nicht ändern):
${existing.anonymized_situation ?? ""}

Anonymisiertes Ergebnis (Kontext, nicht ändern):
${existing.anonymized_outcome ?? ""}

Anweisung zur Überarbeitung:
${instruction}`;

      const refineRes = await callAnthropicTool({
        apiKey: ANTHROPIC_API_KEY,
        systemPrompt: refineSystem,
        userMessage: refineUser,
        maxTokens: 2000,
        tool: {
          name: "return_refined_post",
          description: "Return the refined LinkedIn post with title.",
          input_schema: {
            type: "object",
            properties: {
              post_title: { type: "string" },
              post: { type: "string" },
            },
            required: ["post_title", "post"],
            additionalProperties: false,
          },
        },
      });
      if (!refineRes.ok) {
        console.error("refine error", refineRes.status, refineRes.error);
        const status = refineRes.status === 429 ? 429 : 502;
        return new Response(JSON.stringify({ error: status === 429 ? "rate_limited" : "ai_error" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const refined: any = refineRes.data;
      const history = Array.isArray(existing.refinement_history) ? existing.refinement_history : [];
      history.push({ instruction, at: new Date().toISOString(), by: callerId });

      const { error: refUpdErr } = await admin
        .from("linkedin_pool")
        .update({
          generated_post: refined.post ?? existing.generated_post,
          post_title: refined.post_title ?? existing.post_title,
          refinement_history: history,
          curated_by: callerId,
          curated_at: new Date().toISOString(),
        })
        .eq("id", pool_id);
      if (refUpdErr) {
        return new Response(JSON.stringify({ error: "db_error", details: refUpdErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, post_title: refined.post_title, post: refined.post }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ GENERATE MODE (default) ============
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

Liefere zusätzlich einen kurzen sachlichen Titel (max ~80 Zeichen, kein Clickbait).
Antworte ausschließlich über das bereitgestellte Tool.`;

    const toolRes = await callAnthropicTool({
      apiKey: ANTHROPIC_API_KEY,
      systemPrompt,
      userMessage: `Verhandlungs-Material (Roh):\n\n${casePayload}`,
      maxTokens: 2000,
      tool: {
        name: "return_linkedin_post",
        description: "Return the anonymized case + LinkedIn post.",
        input_schema: {
          type: "object",
          properties: {
            post_title: { type: "string" },
            anonymized_situation: { type: "string" },
            anonymized_outcome: { type: "string" },
            post: { type: "string" },
          },
          required: ["post_title", "anonymized_situation", "anonymized_outcome", "post"],
          additionalProperties: false,
        },
      },
    });
    if (!toolRes.ok) {
      console.error("AI anthropic error", toolRes.status, toolRes.error);
      if (toolRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "ai_error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed: any = toolRes.data;

    const update = {
      template_key,
      post_title: parsed.post_title ?? null,
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