// STRATEGOS AI Router — multi-model routing via Lovable AI Gateway
// Free  -> google/gemini-2.5-flash-lite (fast, low-cost)
// Pro   -> google/gemini-2.5-flash      (balanced reasoning)
// Elite -> openai/gpt-5                 (premium reasoning, elite tone)

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

function pickModel(plan: string): string {
  switch ((plan || "").toLowerCase()) {
    case "elite":
      return "openai/gpt-5";
    case "pro":
      return "google/gemini-2.5-flash";
    case "free":
    default:
      return "google/gemini-2.5-flash-lite";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { situation_text, user_plan } = await req.json();

    if (!situation_text || typeof situation_text !== "string" || situation_text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "situation_text muss mindestens 10 Zeichen enthalten." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Fallback: simulated mock if no key configured
    if (!LOVABLE_API_KEY) {
      await new Promise((r) => setTimeout(r, 2000));
      return new Response(
        JSON.stringify({ ...MOCK_RESPONSE, model: "mock", plan: user_plan ?? "free" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const model = pickModel(user_plan);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
      return new Response(
        JSON.stringify({ error: "Rate limit erreicht. Bitte kurz warten und erneut versuchen." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI-Guthaben aufgebraucht. Bitte Workspace-Credits aufladen." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI Gateway Fehler", detail: t }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    if (!parsed) {
      // Last-resort fallback so the UI never breaks
      parsed = MOCK_RESPONSE;
    }

    return new Response(
      JSON.stringify({ ...parsed, model, plan: user_plan ?? "free" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("strategos-ai-router error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
