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

const SYSTEM_PROMPT = `You are STRATEGOS in REFINEMENT mode. The user has an existing negotiation draft and wants you to adjust it according to their instruction. Keep the strategic intent intact, only modify tone, length, or emphasis as instructed. Always reply in the requested language. Output only the rewritten draft text — no preamble, no explanation.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Language: ${caseRow.language_label}\nMedium: ${caseRow.medium}\nOriginal situation:\n"""\n${caseRow.situation_text ?? ""}\n"""\n\nCurrent draft:\n"""\n${currentDraft}\n"""\n\nInstruction: ${instruction}\n\nReturn only the rewritten draft in ${caseRow.language_label}.`,
          },
        ],
      }),
    });

    if (response.status === 429) return json({ error: "Rate limit" }, 429);
    if (response.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!response.ok) {
      const t = await response.text();
      console.error("Refinement gateway error", response.status, t);
      return json({ error: "Gateway error" }, 500);
    }

    const data = await response.json();
    const newDraft: string = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (!newDraft) return json({ error: "Empty draft" }, 500);
    return await persistAndReply(service, caseRow, latest, newDraft, instruction, "google/gemini-2.5-flash-lite");
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