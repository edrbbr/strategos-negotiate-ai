// STRATEGOS Refinement — single-call via Lovable AI Gateway.
// Sniper mode: regenerates ONLY the draft, copies analysis/strategy/labels
// from the latest case_versions row, then writes a new version.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `You are STRATEGOS in REFINEMENT mode.
You receive an existing negotiation draft and a user instruction.
Your job: produce a COMPLETE, FULLY REWRITTEN draft that clearly
reflects the user instruction. Do NOT copy the previous draft
sentence by sentence. Restructure freely. Change wording, order,
and emphasis as needed so the change is unmistakable to a reader
who compares both versions.

Hard rules:
- Keep the underlying strategic goal and key facts (numbers, names, deadlines).
- Reply ONLY in the requested language.
- Match the requested medium (email/WhatsApp/SMS/letter) — length and tone.
- Output ONLY the rewritten draft text. No preamble, no labels, no explanation, no markdown fences.`;

const MODEL = "google/gemini-2.5-flash";
const CLASSIFIER_MODEL = "google/gemini-2.5-flash-lite";
const STRATEGY_MODEL = "google/gemini-2.5-flash";

const STRATEGY_CLASSIFIER_PROMPT = `You decide whether a user's refinement instruction
requires a NEW negotiation strategy or only changes draft style/tone/length.

Return regenerate_strategy=true ONLY if the instruction asks for a different
negotiation approach, framework, tactic, or fundamentally different angle
(e.g. "use Harvard method", "be more aggressive negotiator", "try Chris Voss style",
"different strategy", "anchor higher", "use BATNA", "win-win approach").

Return regenerate_strategy=false for pure draft edits like
"shorter", "friendlier", "more formal", "fix typo", "translate", "add greeting",
"remove paragraph X", "change deadline date".

strategy_labels: pick 1-3 from [harvard, chris_voss, ackerman, batna, win_win, hard_bargaining]
that match the NEW strategy if regenerate_strategy=true, otherwise return [].`;

const STRATEGY_REGEN_PROMPT = `You are STRATEGOS strategist. Produce a CONCISE negotiation strategy
(2-4 sentences) reflecting the user's instruction, grounded in the provided analysis.
Reply ONLY in the requested language.
Output ONLY the strategy text — no JSON, no labels, no markdown fences, no preamble.`;

// Rough token-overlap heuristic to detect "the model basically copied the old draft"
function similarityRatio(a: string, b: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const bSet = new Map<string, number>();
  for (const t of bTokens) bSet.set(t, (bSet.get(t) ?? 0) + 1);
  let overlap = 0;
  for (const t of aTokens) {
    const c = bSet.get(t) ?? 0;
    if (c > 0) {
      overlap++;
      bSet.set(t, c - 1);
    }
  }
  return overlap / Math.max(aTokens.length, bTokens.length);
}

async function callGateway(
  apiKey: string,
  systemPrompt: string,
  userContent: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, body };
  }
  const data = await res.json();
  const text: string = (data?.choices?.[0]?.message?.content ?? "").trim();
  return { ok: true, text };
}

async function callPlainGateway(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  temperature = 0.5,
): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    const text: string = (data?.choices?.[0]?.message?.content ?? "").trim();
    return { ok: true, text };
  } catch (e) {
    console.error("plain gateway error", e);
    return { ok: false, status: 0 };
  }
}

const VALID_STRATEGY_LABELS = new Set([
  "harvard", "chris_voss", "ackerman", "batna", "win_win", "hard_bargaining",
]);

async function classifyInstruction(
  apiKey: string,
  instruction: string,
  currentStrategy: string,
): Promise<{ regenerate_strategy: boolean; strategy_labels: string[] }> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: STRATEGY_CLASSIFIER_PROMPT },
          {
            role: "user",
            content:
              `Current strategy:\n"""\n${currentStrategy.slice(0, 600)}\n"""\n\n` +
              `User instruction:\n"""\n${instruction}\n"""`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            description: "Classify whether the instruction requires regenerating the negotiation strategy.",
            parameters: {
              type: "object",
              properties: {
                regenerate_strategy: { type: "boolean" },
                strategy_labels: {
                  type: "array",
                  items: { type: "string", enum: [...VALID_STRATEGY_LABELS] },
                },
              },
              required: ["regenerate_strategy", "strategy_labels"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });
    if (!res.ok) {
      console.warn("classifier non-OK", res.status);
      return { regenerate_strategy: false, strategy_labels: [] };
    }
    const data = await res.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return { regenerate_strategy: false, strategy_labels: [] };
    const parsed = JSON.parse(argsStr);
    const labels: string[] = Array.isArray(parsed.strategy_labels)
      ? parsed.strategy_labels.filter((l: unknown) => typeof l === "string" && VALID_STRATEGY_LABELS.has(l))
      : [];
    return {
      regenerate_strategy: Boolean(parsed.regenerate_strategy),
      strategy_labels: labels,
    };
  } catch (e) {
    console.warn("classifier failed, fallback to draft-only", e);
    return { regenerate_strategy: false, strategy_labels: [] };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { case_id, instruction } = await req.json().catch(() => ({}));
    if (!case_id || typeof case_id !== "string") return json({ error: "case_id missing" }, 400);
    if (!instruction || typeof instruction !== "string" || instruction.trim().length < 2) {
      return json({ error: "instruction missing" }, 400);
    }

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load case + latest version
    const { data: caseRow, error: caseErr } = await service
      .from("cases")
      .select("id, user_id, language_label, medium, situation_text")
      .eq("id", case_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (caseErr || !caseRow) return json({ error: "Case not found" }, 404);

    const { data: latest, error: latestErr } = await service
      .from("case_versions")
      .select("*")
      .eq("case_id", case_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestErr || !latest) return json({ error: "No prior version" }, 404);

    const currentDraft: string = latest.draft ?? "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      const newDraft = `${currentDraft}\n\n[Refinement (mock): ${instruction}]`;
      return await persistAndReply(service, caseRow, latest, newDraft, instruction, "mock");
    }

    const buildUserContent = (extraNudge?: string) =>
      `INSTRUCTION (highest priority):\n${instruction}\n\n` +
      `LANGUAGE: ${caseRow.language_label}\n` +
      `MEDIUM: ${caseRow.medium}\n\n` +
      `ORIGINAL SITUATION:\n"""\n${caseRow.situation_text ?? ""}\n"""\n\n` +
      `PREVIOUS DRAFT (rewrite this completely according to the instruction above):\n"""\n${currentDraft}\n"""\n\n` +
      `Now return the fully rewritten draft in ${caseRow.language_label}.\n` +
      `Do not start with the same opening as the previous draft unless the instruction explicitly asks for it.` +
      (extraNudge ? `\n\n${extraNudge}` : "");

    let result = await callGateway(LOVABLE_API_KEY, SYSTEM_PROMPT, buildUserContent());
    if (!result.ok) {
      if (result.status === 429) return json({ error: "Rate limit" }, 429);
      if (result.status === 402) return json({ error: "AI credits exhausted" }, 402);
      console.error("Refinement gateway error", result.status, result.body);
      return json({ error: "Gateway error" }, 500);
    }
    let newDraft = result.text;
    if (!newDraft) return json({ error: "Empty draft" }, 500);

    // Sanity check: if too similar to the previous draft, retry once with a stronger nudge.
    const sim = similarityRatio(newDraft, currentDraft);
    if (sim > 0.85) {
      console.log("Refinement too similar (ratio=", sim, "), retrying with stronger nudge");
      const retry = await callGateway(
        LOVABLE_API_KEY,
        SYSTEM_PROMPT,
        buildUserContent(
          "The previous attempt was too similar to the old draft. Rewrite more boldly: change structure, opening, and wording.",
        ),
      );
      if (retry.ok && retry.text) newDraft = retry.text;
    }

    return await persistAndReply(service, caseRow, latest, newDraft, instruction, MODEL);
  } catch (e) {
    console.error("strategos-refinement error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// Helpers
type LatestRow = {
  id: string; case_id: string; user_id: string; version_number: number;
  analysis: unknown; strategy: string | null; draft: string | null;
  strategy_labels: string[];
};
type CaseRow = { id: string; user_id: string; language_label: string; medium: string; situation_text: string | null };

async function persistAndReply(
  service: ReturnType<typeof createClient>,
  caseRow: CaseRow,
  latest: LatestRow,
  newDraft: string,
  instruction: string,
  model: string,
) {
  const nextNumber = latest.version_number + 1;
  const { data: inserted, error: insErr } = await service
    .from("case_versions")
    .insert({
      case_id: caseRow.id,
      user_id: caseRow.user_id,
      version_number: nextNumber,
      kind: "refinement",
      user_prompt: instruction,
      analysis: latest.analysis,
      strategy: latest.strategy,
      draft: newDraft,
      strategy_labels: latest.strategy_labels,
      model_used: model,
    })
    .select("id")
    .single();
  if (insErr) {
    console.error("version insert failed", insErr);
    return json({ error: "Persist failed" }, 500);
  }

  await service
    .from("cases")
    .update({
      draft: newDraft,
      current_version_id: inserted.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseRow.id);

  // Fire-and-forget: regenerate quick suggestions for the new version
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/strategos-suggest-refinements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ case_id: caseRow.id, _internal: true, _user_id: caseRow.user_id }),
  }).catch(() => undefined);

  return json({ refined_draft: newDraft, version_id: inserted.id, version_number: nextNumber, model });
}