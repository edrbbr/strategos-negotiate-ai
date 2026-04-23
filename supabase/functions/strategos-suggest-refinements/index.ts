// STRATEGOS Suggest Refinements — generates 4 case-specific refinement quick-actions
// using the cheapest model. Caches result on cases.quick_suggestions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json().catch(() => ({}));
    const case_id: string | undefined = body?.case_id;
    if (!case_id) return json({ error: "case_id missing" }, 400);

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth: either user JWT or service-internal call
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (body?._internal === true && body?._user_id && authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY)) {
      userId = String(body._user_id);
    } else if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: u } = await userClient.auth.getUser(token);
      userId = u?.user?.id ?? null;
    }
    if (!userId) return json({ error: "Unauthorized" }, 401);

    // Load case + current version
    const { data: caseRow } = await service
      .from("cases")
      .select("id, user_id, language_label, medium, situation_text, current_version_id, quick_suggestions, quick_suggestions_version_id")
      .eq("id", case_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!caseRow) return json({ error: "Case not found" }, 404);

    // Cache check (skip if up-to-date)
    if (
      caseRow.quick_suggestions &&
      caseRow.quick_suggestions_version_id === caseRow.current_version_id &&
      body?.force !== true
    ) {
      return json({ suggestions: caseRow.quick_suggestions, cached: true });
    }

    const { data: latest } = await service
      .from("case_versions")
      .select("analysis, strategy, draft, strategy_labels, version_number")
      .eq("case_id", case_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return json({ error: "No version available" }, 404);

    const { data: strategies } = await service
      .from("negotiation_strategies")
      .select("key, label, description")
      .eq("is_active", true)
      .order("sort_order");
    const strategyHints = (strategies ?? []).map((s) => `${s.label}: ${s.description ?? ""}`).join("\n");

    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const systemPrompt = `You are STRATEGOS Suggest Engine. Produce exactly 4 highly specific, case-tailored refinement suggestions for the negotiation draft.

Constraints:
- Reply in language: ${caseRow.language_label}
- Communication medium: ${caseRow.medium} (adapt tone/length expectations accordingly)
- Each suggestion has: label (max 4 words, action-oriented) and prompt (1 sentence, imperative, specific to THIS case's facts).
- The prompts must reference concrete details from the situation, analysis, strategy, or draft (e.g. dates, amounts, parties, claims).
- Vary the angles: tone, structure, strategy, escalation, empathy, bargaining.
- Negotiation styles you may invoke when appropriate (do not force):
${strategyHints}
- Never produce generic suggestions like "make it shorter" without case-specific reasoning.`;

    const userPrompt = `Situation:\n"""\n${caseRow.situation_text ?? ""}\n"""\n\nAnalysis (bullets):\n${JSON.stringify(latest.analysis ?? [])}\n\nStrategy:\n"""\n${latest.strategy ?? ""}\n"""\n\nCurrent draft:\n"""\n${latest.draft ?? ""}\n"""\n\nReturn 4 case-specific refinement suggestions via the suggest_refinements tool.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    let aiResp: Response;
    try {
      aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_refinements",
              description: "Return 4 case-specific refinement suggestions.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Max 4 words, action-oriented." },
                        prompt: { type: "string", description: "One sentence, imperative, case-specific." },
                      },
                      required: ["label", "prompt"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_refinements" } },
        }),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const aborted = (err as Error)?.name === "AbortError";
      console.error("suggest gateway fetch failed", aborted ? "timeout" : err);
      return json({ error: aborted ? "AI timeout" : "Gateway unreachable" }, 504);
    }
    clearTimeout(timeoutId);

    if (aiResp.status === 429) return json({ error: "Rate limit" }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("suggest gateway error", aiResp.status, t);
      return json({ error: "Gateway error" }, 500);
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: Array<{ label: string; prompt: string }> = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (Array.isArray(parsed?.suggestions)) suggestions = parsed.suggestions;
      } catch (e) {
        console.error("parse tool args failed", e);
      }
    }
    suggestions = suggestions.slice(0, 4).filter((s) => s?.label && s?.prompt);
    if (suggestions.length === 0) return json({ error: "No suggestions" }, 500);

    await service
      .from("cases")
      .update({
        quick_suggestions: suggestions,
        quick_suggestions_version_id: caseRow.current_version_id,
      })
      .eq("id", case_id);

    return json({ suggestions, cached: false });
  } catch (e) {
    console.error("strategos-suggest-refinements error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});