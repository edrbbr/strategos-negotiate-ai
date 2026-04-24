// STRATEGOS Upgrade Preview
// Generates a tightly truncated "what Pro would have produced" snippet for Free
// users so the upgrade nudge in the case detail is honest and concrete.
// - Server-truncates the draft to its first paragraph only (no full draft leakage).
// - Persists a single row per case in `upgrade_previews`.
// - Idempotent: skips if a preview already exists for the case.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PREVIEW_MODEL = "google/gemini-2.5-flash";

const PREVIEW_SYSTEM = `You are STRATEGOS in PREVIEW mode. The user is on the Free plan.
You receive: situation, current Free-tier strategy, an analysis bullet list and
the rich tier strategy whitelist that the Pro plan unlocks. Your task: pick ONE
Pro-only strategic angle the Free strategy is missing, and produce a SHORT
three-key preview (no full draft).

Return strict JSON with keys:
- pro_strategy_label: short tactic name (max 60 chars), drawn from the whitelist.
- pro_strategy: 2 sentences explaining why this Pro-only tactic is sharper than the Free one for this situation.
- pro_first_paragraph: the FIRST PARAGRAPH ONLY of how the Pro draft would open (max ~60 words). Do not produce the full draft.
- pro_extra_insight: one specific cross-document or leverage insight a Pro user would gain (max 40 words).

Reply ONLY in the language used in the user message. No markdown fences, no preamble.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const case_id: string | undefined = body?.case_id;
    const internal: boolean = body?._internal === true;
    const internalUserId: string | undefined = body?._user_id;
    const freeStrategySnapshot: string = typeof body?.free_strategy === "string" ? body.free_strategy : "";

    if (!case_id) return json({ error: "case_id missing" }, 400);

    // Auth: either internal call (service role) or end-user call
    let userId: string;
    if (internal && internalUserId) {
      userId = internalUserId;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u, error } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (error || !u?.user?.id) return json({ error: "Unauthorized" }, 401);
      userId = u.user.id;
    }

    // Idempotency: skip if we already have a preview row
    const { data: existing } = await service
      .from("upgrade_previews")
      .select("id")
      .eq("case_id", case_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return json({ ok: true, skipped: true, id: existing.id });

    // Verify user owns the case + load context
    const { data: caseRow, error: caseErr } = await service
      .from("cases")
      .select("id, user_id, situation_text, language_label, medium, strategy, analysis")
      .eq("id", case_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (caseErr || !caseRow) return json({ error: "Case not found" }, 404);

    // Load Pro-tier whitelist (anything available at pro level)
    const { data: stratRows } = await service
      .from("negotiation_strategies")
      .select("key, label, prompt_hint, min_tier")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const proStrategies = (stratRows ?? []).filter(
      (s: { min_tier?: string }) => (s.min_tier ?? "free") === "pro",
    );

    if (!LOVABLE_API_KEY || proStrategies.length === 0) {
      // Fallback: persist a static placeholder so the UI still shows the panel
      const { error: insErr } = await service.from("upgrade_previews").insert({
        case_id,
        user_id: userId,
        free_strategy_snapshot: freeStrategySnapshot || caseRow.strategy || null,
        pro_strategy_label: "BATNA-Hebel",
        pro_strategy: "Pro nutzt eine zweite Verhandlungsfront, die der aktuellen Strategie fehlt.",
        pro_first_paragraph: "Sehr geehrte/r …, vor unserem nächsten Schritt möchten wir einen alternativen Pfad transparent machen, der unsere Position spürbar stärkt.",
        pro_extra_insight: "Erkennt eine konkrete Zeitdruck-Schwäche der Gegenseite, die im Free-Modus unsichtbar bleibt.",
      });
      if (insErr) console.error("preview fallback insert failed", insErr);
      return json({ ok: true, fallback: true });
    }

    const analysisLines = Array.isArray(caseRow.analysis)
      ? (caseRow.analysis as unknown as string[]).map((b) => "- " + String(b)).join("\n")
      : "";
    const whitelist = proStrategies
      .map((s) => `- ${s.label}${s.prompt_hint ? ` — ${s.prompt_hint}` : ""}`)
      .join("\n");

    const userMessage =
      `LANGUAGE: ${caseRow.language_label}\n` +
      `MEDIUM: ${caseRow.medium}\n\n` +
      `SITUATION:\n"""\n${caseRow.situation_text ?? ""}\n"""\n\n` +
      `ANALYSIS:\n${analysisLines}\n\n` +
      `CURRENT FREE STRATEGY:\n"""\n${freeStrategySnapshot || caseRow.strategy || ""}\n"""\n\n` +
      `PRO-ONLY STRATEGY WHITELIST (pick exactly one Pro-only tactic the Free strategy lacks):\n${whitelist}\n\n` +
      `Now return the JSON.`;

    const tool = {
      type: "function" as const,
      function: {
        name: "return_preview",
        description: "Return the Pro-tier upgrade preview (truncated).",
        parameters: {
          type: "object",
          properties: {
            pro_strategy_label: { type: "string" },
            pro_strategy: { type: "string" },
            pro_first_paragraph: { type: "string" },
            pro_extra_insight: { type: "string" },
          },
          required: ["pro_strategy_label", "pro_strategy", "pro_first_paragraph", "pro_extra_insight"],
          additionalProperties: false,
        },
      },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: PREVIEW_MODEL,
        temperature: 0.3,
        messages: [
          { role: "system", content: PREVIEW_SYSTEM },
          { role: "user", content: userMessage },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "return_preview" } },
      }),
    });

    if (!resp.ok) {
      console.error("preview gateway error", resp.status, await resp.text());
      return json({ error: "Gateway error" }, 502);
    }
    const data = await resp.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) {
      console.error("preview missing tool call");
      return json({ error: "Bad response" }, 502);
    }
    const parsed = JSON.parse(argsStr) as {
      pro_strategy_label?: string;
      pro_strategy?: string;
      pro_first_paragraph?: string;
      pro_extra_insight?: string;
    };

    // SERVER-SIDE TRUNCATION — never trust the model
    const firstPara = String(parsed.pro_first_paragraph ?? "").split(/\n{2,}/)[0].slice(0, 600);
    const insight = String(parsed.pro_extra_insight ?? "").slice(0, 280);
    const strategy = String(parsed.pro_strategy ?? "").slice(0, 500);
    const label = String(parsed.pro_strategy_label ?? "").slice(0, 60);

    const { error: insErr } = await service.from("upgrade_previews").insert({
      case_id,
      user_id: userId,
      free_strategy_snapshot: freeStrategySnapshot || caseRow.strategy || null,
      pro_strategy_label: label,
      pro_strategy: strategy,
      pro_first_paragraph: firstPara,
      pro_extra_insight: insight,
    });
    if (insErr) {
      console.error("preview insert failed", insErr);
      return json({ error: "Persist failed" }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("strategos-upgrade-preview error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});