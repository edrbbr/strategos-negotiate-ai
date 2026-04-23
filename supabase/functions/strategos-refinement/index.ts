// STRATEGOS Refinement — single-call via Lovable AI Gateway.
// Adjusts an existing draft based on a user instruction (e.g. "Make it more aggressive").

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

const SYSTEM_PROMPT = `You are STRATEGOS in REFINEMENT mode. The user has an existing negotiation draft and wants you to adjust it according to their instruction. Keep the strategic intent intact, only modify tone, length, or emphasis as instructed. Always reply in the language of the original draft (default German). Output only the rewritten draft text — no preamble, no explanation.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const { current_draft, instruction } = await req.json().catch(() => ({}));
    if (!current_draft || typeof current_draft !== "string") {
      return json({ error: "current_draft missing" }, 400);
    }
    if (!instruction || typeof instruction !== "string" || instruction.trim().length < 2) {
      return json({ error: "instruction missing" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({
        refined_draft: `${current_draft}\n\n[Refinement (mock): ${instruction}]`,
        model: "mock",
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Original draft:\n"""\n${current_draft}\n"""\n\nInstruction: ${instruction}\n\nReturn only the rewritten draft.`,
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
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return json({ refined_draft: content.trim(), model: "google/gemini-2.5-flash" });
  } catch (e) {
    console.error("strategos-refinement error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});