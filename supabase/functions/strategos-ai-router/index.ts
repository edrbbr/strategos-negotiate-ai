// STRATEGOS AI Router — multi-model routing via Lovable AI Gateway
// Plan & model are resolved server-side from the authenticated user's profile.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are STRATEGOS, an elite corporate negotiation AI. You utilize principles from game theory, tactical empathy (Chris Voss), and the Harvard Negotiation Project. Your tone is highly professional, sharply analytical, sovereign, and emotionally detached but strategically empathetic. You never sound like a generic AI. You must return a strict JSON object with exactly three keys:

- 'analysis': Brief bullet points of the counterparty's weaknesses and the power dynamic.
- 'strategy': The name of the tactic applied (e.g., 'Anchoring-Pivot') and a 2-sentence explanation.
- 'draft': A highly professional, subtly aggressive but bulletproof email/script for the user to copy. It must leave the counterparty no escape while allowing them to save face.`;

const MOCK_RESPONSE = {
  analysis: [
    "Ziel-Analyse: Maximierung der kurzfristigen Liquidität bei Erhaltung der langfristigen Lieferantenbeziehung.",
    "Gegenpartei: Dominantes Verhalten, Fokus auf Standardisierung. Schwachpunkt: Zeitdruck zum Quartalsende.",
    "Machtdynamik: Asymmetrisch zugunsten der Gegenseite — jedoch fragil durch internen Reporting-Zwang.",
  ],
  strategy:
    "Anchoring-Pivot — Wir akzeptieren die technischen Parameter und verschieben den Verhandlungsanker auf die Revisionsklausel. So entsteht eine zweite Front, die der Gegenseite Konzessionsraum nimmt, ohne ihr Gesicht zu kosten.",
  draft:
    "Sehr geehrte Damen und Herren,\n\nwir haben die vorliegenden Parameter sorgfältig geprüft. Während die technische Spezifikation unseren Anforderungen entspricht, ist die aktuelle Zahlungsziel-Regelung in dieser Form für uns nicht abbildbar. Wir schlagen vor, den Fokus auf eine exklusive Revisionsklausel nach 6 Monaten zu legen, um die Partnerschaft agil und für beide Seiten tragfähig zu halten.\n\nWir gehen davon aus, dass Ihnen an einer zügigen Einigung vor Quartalsende gelegen ist und erwarten Ihre Rückmeldung bis Freitag, 17:00 Uhr.\n\nMit freundlichen Grüßen",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- AUTH ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claims.claims.sub as string;

    // ---- PROFILE + PLAN ----
    const { data: profile, error: profileErr } = await userClient
      .from("profiles")
      .select("plan_id, cases_used, plans!inner(id, model_id, case_limit, case_limit_type)")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      console.error("Profile load failed", profileErr);
      return json({ error: "Profile not found" }, 500);
    }

    type PlanRow = {
      id: string;
      model_id: string;
      case_limit: number | null;
      case_limit_type: string;
    };
    const planRel = profile.plans as unknown;
    const plan: PlanRow | null = Array.isArray(planRel)
      ? (planRel[0] as PlanRow)
      : (planRel as PlanRow);
    if (!plan) return json({ error: "Plan not found" }, 500);

    // ---- LIMIT ENFORCEMENT ----
    if (
      plan.case_limit !== null &&
      plan.case_limit_type === "lifetime" &&
      profile.cases_used >= plan.case_limit
    ) {
      return json(
        {
          error: "CASE_LIMIT_REACHED",
          message: "Du hast dein Free-Tier-Limit erreicht. Upgrade erforderlich.",
          cases_used: profile.cases_used,
          case_limit: plan.case_limit,
        },
        403,
      );
    }

    // ---- INPUT ----
    const { situation_text } = await req.json();
    if (
      !situation_text ||
      typeof situation_text !== "string" ||
      situation_text.trim().length < 10
    ) {
      return json(
        { error: "situation_text muss mindestens 10 Zeichen enthalten." },
        400,
      );
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const incrementAndReturn = async (payload: {
      analysis: string[];
      strategy: string;
      draft: string;
      model: string;
    }) => {
      const { data: newCount } = await serviceClient.rpc("increment_cases_used", {
        p_user_id: userId,
      });
      return json({
        ...payload,
        plan: plan.id,
        cases_used: typeof newCount === "number" ? newCount : profile.cases_used + 1,
        case_limit: plan.case_limit,
      });
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // ---- MOCK FALLBACK ----
    if (!LOVABLE_API_KEY) {
      await new Promise((r) => setTimeout(r, 2000));
      return await incrementAndReturn({ ...MOCK_RESPONSE, model: "mock" });
    }

    // ---- AI CALL ----
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: plan.model_id,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Situation:\n"""\n${situation_text}\n"""\n\nLiefere die strategische Auswertung.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_strategos_analysis",
              description: "Return the elite negotiation analysis as a strict JSON object.",
              parameters: {
                type: "object",
                properties: {
                  analysis: {
                    type: "array",
                    items: { type: "string" },
                    description: "Bullet points: counterparty weaknesses and power dynamic.",
                  },
                  strategy: {
                    type: "string",
                    description: "Tactic name + 2-sentence explanation.",
                  },
                  draft: {
                    type: "string",
                    description: "Bulletproof email/script for the user to copy.",
                  },
                },
                required: ["analysis", "strategy", "draft"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_strategos_analysis" } },
      }),
    });

    if (response.status === 429) {
      return json(
        { error: "Rate limit erreicht. Bitte kurz warten und erneut versuchen." },
        429,
      );
    }
    if (response.status === 402) {
      return json(
        { error: "AI-Guthaben aufgebraucht. Bitte Workspace-Credits aufladen." },
        402,
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return json({ error: "AI Gateway Fehler", detail: t }, 500);
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;

    let parsed: { analysis: string[]; strategy: string; draft: string } | null = null;
    if (argsStr) {
      try {
        parsed = JSON.parse(argsStr);
      } catch (e) {
        console.error("Failed to parse tool arguments", e, argsStr);
      }
    }
    if (!parsed) parsed = MOCK_RESPONSE;

    return await incrementAndReturn({ ...parsed, model: plan.model_id });
  } catch (e) {
    console.error("strategos-ai-router error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
