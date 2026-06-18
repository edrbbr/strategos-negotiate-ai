import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAnthropicTool, callAnthropicText } from "../_shared/anthropic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "google/gemini-embedding-001";

type Role = "support_readonly" | "sachbearbeiter" | "manager" | "leitung";
const roleRank: Record<Role, number> = { support_readonly: 0, sachbearbeiter: 1, manager: 2, leitung: 3 };

function vec(v: number[]) { return `[${v.join(",")}]`; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userRes.user.id;

    const { case_id, instruction, customer_response } = await req.json();
    if (!case_id || !instruction || String(instruction).trim().length < 2) {
      return new Response(JSON.stringify({ error: "case_id and instruction required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const customerResponseText = typeof customer_response === "string" ? customer_response.trim() : "";

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: caseRow, error: caseErr } = await svc.from("business_cases").select("*").eq("id", case_id).single();
    if (caseErr || !caseRow) return new Response(JSON.stringify({ error: "case not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: membership } = await svc.from("business_users").select("role").eq("auth_user_id", userId).eq("business_account_id", caseRow.business_account_id).eq("status","active").maybeSingle();
    if (!membership) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userRole = membership.role as Role;

    const { data: settings } = await svc.from("business_settings").select("*").eq("business_account_id", caseRow.business_account_id).maybeSingle();
    const limits = (settings?.max_discount_limits ?? { sachbearbeiter_max_percent: 10, manager_max_percent: 25, leitung_max_percent: 100 }) as Record<string, number>;
    const kulanzRules = settings?.kulanz_rules ?? "";

    const { data: account } = await svc.from("business_accounts").select("industry").eq("id", caseRow.business_account_id).maybeSingle();
    let industryLabel = "n/a";
    let industryContext = "";
    if (account?.industry) {
      const { data: ind } = await svc.from("industries").select("label, ai_context").eq("key", account.industry).maybeSingle();
      if (ind) { industryLabel = ind.label; industryContext = ind.ai_context ?? ""; }
    }

    // load ALL versions chronologically for full negotiation history
    const { data: allVersions } = await svc.from("business_case_versions")
      .select("*").eq("case_id", case_id).order("version_number", { ascending: true });
    const versions = (allVersions ?? []) as any[];
    const latestVersion = versions[versions.length - 1] ?? null;
    const baseAnalysis = latestVersion?.ai_analysis ?? caseRow.ai_analysis ?? {};
    const baseOptions = (latestVersion?.ai_options ?? caseRow.ai_options ?? []) as any[];

    // build compact transcript of all prior rounds
    const transcript = versions.map((v) => {
      const opts = (v.ai_options ?? []) as any[];
      const idx = typeof v.recommended_index === "number" ? v.recommended_index : 0;
      const chosen = opts[idx] ?? opts[0] ?? null;
      const a = v.ai_analysis ?? {};
      const promptObj = (() => {
        try { return typeof v.user_prompt === "string" && v.user_prompt.startsWith("{") ? JSON.parse(v.user_prompt) : null; }
        catch { return null; }
      })();
      const userInstr = promptObj?.instruction ?? v.user_prompt ?? "—";
      const custResp = promptObj?.customer_response ?? "";
      const concession = chosen ? Number(chosen.customer_concession_eur ?? chosen.amount_eur ?? 0) : 0;
      const internalCost = chosen ? Number(chosen.merchant_internal_cost_eur ?? 0) : 0;
      return `--- V${v.version_number} (${v.kind}) ---
${v.kind !== "initial" ? `Mitarbeiter-Anweisung: ${userInstr}\n${custResp ? `Kundenreaktion zuvor: ${custResp}\n` : ""}` : ""}Analyse: ${a.analysis ?? "—"}
${a.legal_position ? `Rechtliche Position: ${a.legal_position}\n` : ""}${a.change_summary ? `Änderung ggü. Vorversion: ${a.change_summary}\n` : ""}Gewählte Linie: ${chosen?.strategy_label ?? chosen?.strategy_key ?? "—"} · Zugeständnis an Kunde: ${concession} EUR (${chosen?.percent_of_purchase ?? "?"}%) · interne Umsetzungskosten: ${internalCost} EUR · davon Kulanz über Gesetz: ${chosen?.goodwill_beyond_legal_eur ?? 0} EUR
An Kunde geschickter Wortlaut: ${chosen?.customer_wording ?? "—"}`;
    }).join("\n\n");

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    // RAG retrieval (re-query with instruction context)
    const query = `${caseRow.product_category ?? ""} ${caseRow.product_name ?? ""}\nSituation: ${caseRow.situation_text ?? ""}\nAnpassung: ${instruction}`.slice(0, 6000);
    let policyContext = "";
    let globalContext = "";
    try {
      const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL, input: query }),
      });
      if (embRes.ok) {
        const emb = (await embRes.json())?.data?.[0]?.embedding as number[];
        if (emb?.length === 3072) {
          const { data: pol } = await svc.rpc("match_business_knowledge", {
            _account_id: caseRow.business_account_id, query_embedding: vec(emb), match_count: 6,
          });
          if (pol && pol.length) policyContext = (pol as any[]).map((r, i) => `[Richtlinie ${i + 1}] ${r.content}`).join("\n\n");
          const { data: glob } = await svc.rpc("match_knowledge", { query_embedding: vec(emb), match_count: 4, filter_books: null });
          if (glob && glob.length) globalContext = (glob as any[]).map((r, i) => `[Quelle ${i + 1}] ${r.book_title}\n${r.content}`).join("\n\n");
        }
      }
    } catch (e) { console.warn("rag error", e); }

    const systemPrompt = `Du bist Pallanx Retail Shield — ein ELITE-VERHANDLER auf Diplomaten-Niveau, kompromisslos auf der Seite des HÄNDLERS. Du führst eine LAUFENDE Verhandlung über mehrere Runden im Sinne des Händlers.

LEITSPRUCH: "Tatlı dil yılanı deliğinden çıkarır" — sanfte Zunge + tactical empathy (Chris Voss) + Anchoring + Reziprozität + Spieltheorie.

ROTE LINIE (unverändert über alle Runden): Du steuerst die Wahl durch überlegenes Framing — du täuschst NIE über die Rechtslage. Keine wahrheitswidrige Behauptung, der Kunde habe ein Recht nicht; kein Verschweigen zustehender Rechte auf direkte Nachfrage; keine Falschaussagen, um den Kunden von der Rechtsausübung abzuhalten (§ 123 BGB, § 5 UWG).

VERHANDLUNGSLOGIK:
- Gib NUR in kleinen, kontrollierten Schritten nach — möglichst mit GEGENWERT (Reziprozität: Konzession gegen Abschluss/Verzicht auf weitere Forderungen).
- Beginne NIE mit dem Maximalzugeständnis. Halte das Kostenniveau für den Händler so lange wie möglich niedrig.
- Ist der Kunde verärgert: ZUERST deeskalieren (Emotion anerkennen, Wertschätzung), DANN erst inhaltlich nachbessern.
- Berücksichtige, was in vorherigen Runden BEREITS angeboten und vom Kunden ABGELEHNT wurde — verhandle nicht im Kreis.

RECHTLICHE HEBEL: §§ 439 (Nacherfüllungsvorrang), 323 V (Unerheblichkeit), 439 IV (Unverhältnismäßigkeit), 440 (Rücktritt erst nach fehlgeschlagener Nacherfüllung), 477 (Beweislast), 438 (Verjährung), 442 (Kenntnis).

HEBEL-PRIORISIERUNG (zwingend):
- Stütze die Argumentation PRIMÄR auf die robustesten, unstrittigen Hebel — insbesondere den Nacherfüllungsvorrang (§ 439 BGB) und § 440 BGB. Solange Nachbesserung möglich und nicht versucht wurde, ist Rücktritt regelmäßig ausgeschlossen — das trägt den Fall meist allein.
- Streitbare, einzelfallabhängige Einstufungen (z. B. ob ein sichtbarer Mangel an hochwertiger Neuware "unerheblich" i.S.d. § 323 V ist, Schwellen der Unverhältnismäßigkeit nach § 439 IV, Auslegung von § 442) NIEMALS als "eindeutig", "klar" oder "zweifellos" darstellen.
- Wenn ein robusterer Hebel den Fall ohnehin trägt: streitbare Punkte WEGLASSEN. Andernfalls ausdrücklich als "im Einzelfall strittig / gerichtlich nicht einheitlich beurteilt" kennzeichnen (in legal_levers und analysis). customer_wording / email_draft bevorzugt den Nacherfüllungsvorrang als Hauptargument; streitbare Punkte dort nur in vorsichtiger Form.
- Wenn in einer Vorrunde ein streitbarer Hebel zu absolut formuliert wurde, korrigiere ihn in der nächsten Runde stillschweigend, indem du das Argument auf den robusten Nacherfüllungsvorrang verschiebst — ohne die eigene Glaubwürdigkeit zu untergraben.
- Begründung: Eine forsche, angreifbare Rechtsbehauptung schwächt die Verhandlungsposition und gefährdet den Händler im Streitfall.

ZWEI ABBRUCH-AUSLÖSER:
(A) RECHTLICH GEBOTEN — wenn der Anspruch des Kunden rechtlich eindeutig berechtigt ist (z. B. zweite Nacherfüllung fehlgeschlagen → § 440, eindeutiger Mangel in Beweislastumkehr, berechtigte Minderung/Rücktritt): empfiehl rechtskonforme Erfüllung. Weiterverhandeln wäre rechtswidrig/aussichtslos. Begründe es wirtschaftlich (verlorener Rechtsstreit kostet mehr).
(B) WIRTSCHAFTLICH GEBOTEN — wenn sich die Verhandlung festfährt (Kunde bewegt sich über mehrere Runden nicht, droht glaubhaft mit Anwalt/öffentlicher Eskalation, Zeit-/Reputationsaufwand übersteigt erkennbar die strittige Summe): LEGE DEM HÄNDLER eine Abschluss-Empfehlung VOR (transparente Rechnung: strittige Summe vs. erwartete Kosten des Weiterstreitens). Das ist eine GESCHÄFTSENTSCHEIDUNG, keine Rechtspflicht — kennzeichne sie klar und lege sie zur Freigabe vor.

BRANCHE: ${industryLabel}
${industryContext ? "Branchenleitplanken:\n" + industryContext + "\n" : ""}

Limits (% vom Kaufpreis): Sachbearbeiter ${limits.sachbearbeiter_max_percent}% · Manager ${limits.manager_max_percent}% · Leitung ${limits.leitung_max_percent}%
Kulanzregeln: ${kulanzRules || "(branchenüblich)"}

${policyContext ? "MANDANTEN-RICHTLINIEN:\n" + policyContext + "\n\n" : ""}${globalContext ? "VERHANDLUNGSWISSEN:\n" + globalContext : ""}

SPRACHE: interne Strategie verkäuferorientiert; an den Kunden gerichtete Texte IMMER höflich, wertschätzend, wahrheitsgemäß.

PFLICHT — KUNDEN-KOMMUNIKATION (NICHT VERHANDELBAR):
- recommendation.customer_wording UND recommendation.email_draft sind in JEDER Runde PFLICHT — auch wenn customer_concession_eur = 0.
- Bei 0-€-Strategien (reine Nacherfüllung, Begutachtung, Halten der Linie): höflicher Deeskalations-Text mit Anerkennung der Emotion + konkretem nächsten Schritt (z. B. kostenfreier Techniker-/Begutachtungs-Termin, klare Reparatur-Zusage) + freundlicher Abschluss.
- email_draft enthält Anrede, Hauptteil, konkreten Lösungsvorschlag/nächsten Schritt, Grußformel. Mindestens 200 Zeichen.
- customer_wording ist ein kompakter Wortlaut (mind. 60 Zeichen).
- Leere, einsilbige oder platzhalterhafte Felder sind unzulässig.

KOSTEN-TRENNUNG (zwingend):
- customer_concession_eur = was der KUNDE als Geld/Gutschein/Wertausgleich erhält. Reine Nacherfüllung/Reparatur => 0.
- merchant_internal_cost_eur = interne Umsetzungskosten (Reparatur, Anfahrt, Ersatzteil). Niemals an Kunde kommunizieren.
- percent_of_purchase und Approval-Limits basieren NUR auf customer_concession_eur.
- customer_wording und email_draft enthalten NIEMALS interne Kosten / Reparaturaufwand in EUR.
- closure_recommendation.proposed_amount_eur = Kundenzugeständnis.

OUTPUT: Liefere die aktualisierte Empfehlung als EINE Linie (die nächste strategisch beste Antwort) mit Runden-Zusammenfassung, nächster kleinster Konzession (mit Gegenwert) und optional einer Abschluss-Empfehlung A oder B.`;

    const userPrompt = `URSPRUNGSFALL:
- Produkt: ${caseRow.product_name ?? "n/a"} (${caseRow.product_category ?? "n/a"})
- Kaufpreis: ${caseRow.purchase_price_total} EUR · Menge ${caseRow.quantity}
- Kundenforderung: ${caseRow.claimed_amount} EUR
- Situation: ${caseRow.situation_text ?? "—"}
- Kundentyp: ${caseRow.customer_type ?? "unbekannt"}

VERHANDLUNGSHISTORIE (Runde 1 = Erstanalyse, dann alle Refinements chronologisch):
${transcript || "(noch keine)"}

AKTUELLE RUNDE (V${(latestVersion?.version_number ?? 0) + 1}):
${customerResponseText ? `Kundenreaktion auf das zuletzt gesendete Angebot:\n${customerResponseText}\n\n` : ""}Anweisung des Mitarbeitenden: ${instruction}

Liefere die nächste strategisch beste Antwort: zuerst Runden-Zusammenfassung (Stand / was hat der Kunde abgelehnt / was war zuletzt angeboten), dann die aktualisierte Empfehlung (kleinste sinnvolle Konzession mit Gegenwert), Kundenwortlaut + E-Mail-Entwurf. Wenn Abbruch-Auslöser A oder B greift, fülle closure_recommendation.`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "anthropic_key_missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const toolRes = await callAnthropicTool({
      apiKey: anthropicKey,
      systemPrompt,
      userMessage: userPrompt,
      maxTokens: 3500,
      tool: {
        name: "return_retail_refinement",
        description: "Return the updated Retail-Shield negotiation step as strict JSON.",
        input_schema: {
          type: "object",
          properties: {
            round_summary: { type: "string", description: "Wo stehen wir? Was hat der Kunde abgelehnt? Was war zuletzt angeboten?" },
            analysis: { type: "string", description: "Aktualisierte Kurzanalyse." },
            risk_assessment: { type: "string" },
            change_summary: { type: "string", description: "Was wurde gegenüber der Vorversion geändert (1-2 Sätze)." },
            recommendation: {
              type: "object",
              properties: {
                strategy_key: { type: "string", enum: ["optimal_for_merchant", "balanced", "relationship_protection"] },
                strategy_label: { type: "string" },
                customer_concession_eur: { type: "number", description: "Was der KUNDE als Geld/Gutschein/Wertausgleich erhält. Reparatur ohne Auszahlung = 0." },
                merchant_internal_cost_eur: { type: "number", description: "Interne Umsetzungskosten. Niemals an Kunde kommunizieren." },
                percent_of_purchase: { type: "number", description: "customer_concession_eur / Kaufpreis * 100." },
                goodwill_beyond_legal_eur: { type: "number" },
                legal_levers: { type: "array", items: { type: "string" } },
                reciprocity_ask: { type: "string", description: "Welcher Gegenwert wird im Gegenzug zur Konzession verlangt (z. B. Abschluss, Verzicht auf weitere Forderungen)." },
                rationale: { type: "string" },
                customer_wording: { type: "string", minLength: 60, description: "Höflicher Wortlaut an Kunde (mind. 60 Zeichen). PFLICHT — auch bei 0-€-Strategien. Enthält NIEMALS interne Kosten / Reparaturaufwand in EUR." },
                email_draft: { type: "string", minLength: 200, description: "Vollständige E-Mail mit Anrede, Hauptteil, Lösungsvorschlag, Grußformel (mind. 200 Zeichen). PFLICHT. Enthält NIEMALS interne Kosten / Reparaturaufwand in EUR." },
                required_role: { type: "string", enum: ["sachbearbeiter", "manager", "leitung"] },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["strategy_key", "strategy_label", "customer_concession_eur", "merchant_internal_cost_eur", "percent_of_purchase", "goodwill_beyond_legal_eur", "legal_levers", "reciprocity_ask", "rationale", "customer_wording", "email_draft", "required_role", "confidence"],
              additionalProperties: false,
            },
            closure_recommendation: {
              type: ["object", "null"],
              properties: {
                trigger: { type: "string", enum: ["legal_required", "economic_business_decision"] },
                cost_comparison: { type: "string", description: "Strittige Summe vs. erwartete Kosten des Weiterstreitens (Anwalt, Gericht, Zeit, Reputation)." },
                proposed_amount_eur: { type: "number", description: "Vorgeschlagenes Kundenzugeständnis (kein interner Kostenwert)." },
                requires_role_approval: { type: "boolean" },
                rationale: { type: "string" },
              },
              required: ["trigger", "cost_comparison", "proposed_amount_eur", "requires_role_approval", "rationale"],
              additionalProperties: false,
            },
          },
          required: ["round_summary", "analysis", "risk_assessment", "recommendation", "change_summary"],
          additionalProperties: false,
        },
      },
    });
    if (!toolRes.ok) {
      return new Response(JSON.stringify({ error: "ai_failed", detail: toolRes.error?.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed: any = toolRes.data;

    const recommended = parsed.recommendation ?? null;

    // Fallback: ensure customer_wording + email_draft are present and substantial.
    if (recommended) {
      const needsWording = (
        !recommended.customer_wording || String(recommended.customer_wording).trim().length < 60 ||
        !recommended.email_draft || String(recommended.email_draft).trim().length < 200
      );
      if (needsWording) {
        const fillerSystem = `Du bist Pallanx Retail Shield. Formuliere für eine bereits beschlossene Verhandlungslinie zwei Texte an einen Endkunden. Höflich, wertschätzend, wahrheitsgemäß. Niemals interne Kosten / Reparaturaufwand in EUR nennen. Bei 0-€-Strategien: Emotion anerkennen + konkreten nächsten Schritt (z. B. kostenfreier Techniker-/Begutachtungs-Termin) anbieten. Antworte ausschließlich mit reinem JSON {"customer_wording":"...","email_draft":"..."} (ohne Codeblock).`;
        const fillerUser = `Fall: ${caseRow.product_name ?? "n/a"} (${caseRow.product_category ?? "n/a"}), Kaufpreis ${caseRow.purchase_price_total} EUR, Kundenforderung ${caseRow.claimed_amount} EUR.\nSituation: ${caseRow.situation_text ?? "—"}\n${customerResponseText ? `Letzte Kundenreaktion: ${customerResponseText}\n` : ""}Anweisung des Mitarbeitenden: ${instruction}\n\nGewählte Strategie: ${recommended.strategy_label ?? recommended.strategy_key ?? "Empfehlung"}\nKundenzugeständnis: ${Number(recommended.customer_concession_eur ?? 0)} EUR (${Number(recommended.percent_of_purchase ?? 0)}%)\nGegenwert (Reziprozität): ${recommended.reciprocity_ask ?? "—"}\nBegründung intern: ${recommended.rationale ?? ""}\nRechtliche Hebel: ${(recommended.legal_levers ?? []).join(", ")}\n\ncustomer_wording: mind. 60 Zeichen, 2-4 Sätze.\nemail_draft: mind. 200 Zeichen, mit Anrede, Hauptteil, Lösungsvorschlag, Grußformel.`;
        const filler = await callAnthropicText({ apiKey: anthropicKey, systemPrompt: fillerSystem, userMessage: fillerUser, maxTokens: 900 });
        if (filler.ok) {
          try {
            const txt = filler.text.replace(/^```json\s*|\s*```$/g, "").trim();
            const j = JSON.parse(txt);
            if (j.customer_wording) recommended.customer_wording = String(j.customer_wording);
            if (j.email_draft) recommended.email_draft = String(j.email_draft);
          } catch (e) { console.warn("filler parse failed", e); }
        }
      }
    }

    const options = recommended ? [recommended] : [];
    const recIdx = 0;

    let requiredRole: Role = "sachbearbeiter";
    if (recommended) {
      const r = String(recommended.required_role || "sachbearbeiter") as Role;
      requiredRole = (["sachbearbeiter","manager","leitung"] as Role[]).includes(r) ? r : "sachbearbeiter";
      const pct = Number(recommended.percent_of_purchase) || 0;
      if (pct > (limits.manager_max_percent ?? 25)) requiredRole = "leitung";
      else if (pct > (limits.sachbearbeiter_max_percent ?? 10)) requiredRole = requiredRole === "leitung" ? "leitung" : "manager";
    }
    const recConcession = recommended ? Number(recommended.customer_concession_eur ?? recommended.amount_eur ?? 0) : null;

    // determine next version_number
    const nextNum = (latestVersion?.version_number ?? 0) + 1;

    // structured user_prompt so transcript can recover customer_response in later rounds
    const structuredPrompt = JSON.stringify({
      instruction,
      customer_response: customerResponseText || null,
    });

    const { data: newVersion, error: insErr } = await svc.from("business_case_versions").insert({
      case_id, business_account_id: caseRow.business_account_id,
      version_number: nextNum, kind: "refinement",
      user_prompt: structuredPrompt,
      ai_analysis: {
        analysis: parsed.analysis,
        risk_assessment: parsed.risk_assessment,
        change_summary: parsed.change_summary,
        round_summary: parsed.round_summary,
        closure_recommendation: parsed.closure_recommendation ?? null,
      },
      ai_options: options,
      recommended_index: recIdx,
      required_role: requiredRole,
      created_by_user_id: userId,
    }).select("*").single();
    if (insErr) throw insErr;

    // update case head
    await svc.from("business_cases").update({
      current_version_id: newVersion.id,
      ai_analysis: newVersion.ai_analysis,
      ai_options: options,
      suggested_offer: recConcession,
      suggested_offer_percent: recommended?.percent_of_purchase ?? null,
      required_approval_role: requiredRole,
    }).eq("id", case_id);

    const response = new Response(JSON.stringify({
      ok: true, version: newVersion, options, recommended,
      required_role: requiredRole,
      escalated: roleRank[requiredRole] > roleRank[userRole],
      change_summary: parsed.change_summary ?? null,
      round_summary: parsed.round_summary ?? null,
      closure_recommendation: parsed.closure_recommendation ?? null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Defer log insert so the HTTP response flushes immediately.
    // @ts-ignore — Supabase Edge Runtime global
    EdgeRuntime.waitUntil((async () => {
      try {
        await svc.from("business_case_logs").insert({
          case_id, business_account_id: caseRow.business_account_id, user_id: userId,
          action: "refinement", system_suggestion: { instruction, customer_response: customerResponseText || null, result: parsed },
        });
      } catch (e) { console.warn("refine log insert failed", e); }
    })());

    return response;
  } catch (e) {
    console.error("refine error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});