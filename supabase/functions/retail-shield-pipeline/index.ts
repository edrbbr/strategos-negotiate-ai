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

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); }
  catch { return null; }
}

function defaultCustomerText(caseRow: any, recommended: any) {
  const product = caseRow.product_name || "dem Produkt";
  const wording = `Vielen Dank für Ihre Nachricht — ich verstehe gut, dass die Situation für Sie ärgerlich ist. Wir möchten das schnell und fair klären und bieten Ihnen deshalb eine kostenfreie Begutachtung der ${product} an. Danach stimmen wir den passenden nächsten Schritt mit Ihnen ab, selbstverständlich im Rahmen Ihrer gesetzlichen Gewährleistungsrechte.`;
  const email = `Sehr geehrte/r [Kundenname],\n\nvielen Dank für Ihre Nachricht. Ich kann nachvollziehen, dass die Situation für Sie enttäuschend und ärgerlich ist. Uns ist wichtig, den Sachverhalt zügig und fair zu klären.\n\nDamit wir die Ursache zuverlässig beurteilen können, bieten wir Ihnen eine kostenfreie Begutachtung der ${product} an. Im Anschluss besprechen wir mit Ihnen den passenden nächsten Schritt, zum Beispiel eine sachgerechte Nachbesserung, selbstverständlich im Rahmen Ihrer gesetzlichen Gewährleistungsrechte.\n\nBitte teilen Sie uns kurz mit, wann Ihnen ein Termin am besten passt.\n\nMit freundlichen Grüßen\n[Ihr Name]`;
  return { customer_wording: recommended?.customer_wording || wording, email_draft: recommended?.email_draft || email };
}

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

    const body = await req.json();
    const { case_id } = body ?? {};
    if (!case_id) return new Response(JSON.stringify({ error: "case_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: caseRow, error: caseErr } = await svc.from("business_cases").select("*").eq("id", case_id).single();
    if (caseErr || !caseRow) return new Response(JSON.stringify({ error: "case not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // verify membership
    const { data: membership } = await svc.from("business_users").select("role").eq("auth_user_id", userId).eq("business_account_id", caseRow.business_account_id).eq("status","active").maybeSingle();
    if (!membership) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userRole = membership.role as Role;

    const { data: settings } = await svc.from("business_settings").select("*").eq("business_account_id", caseRow.business_account_id).maybeSingle();
    const limits = (settings?.max_discount_limits ?? { sachbearbeiter_max_percent: 10, manager_max_percent: 25, leitung_max_percent: 100 }) as Record<string, number>;
    const kulanzRules = settings?.kulanz_rules ?? "";

    // user's effective limit (built-in or custom role)
    const { data: effLimit } = await svc.rpc("effective_discount_limit", { _user: userId, _account: caseRow.business_account_id });
    const userLimit = Number(effLimit ?? 0);

    // custom roles for prompt context
    const { data: customRoles } = await svc.from("business_custom_roles")
      .select("role_key,label,max_discount_percent,base_role").eq("business_account_id", caseRow.business_account_id);
    const customRolesText = (customRoles ?? []).map((r: any) => `- ${r.label} (Key: ${r.role_key}, basiert auf ${r.base_role}): bis ${r.max_discount_percent}%`).join("\n");

    // industry context
    const { data: account } = await svc.from("business_accounts").select("industry").eq("id", caseRow.business_account_id).maybeSingle();
    const industryKey = account?.industry ?? null;
    let industryLabel = "n/a";
    let industryContext = "";
    if (industryKey) {
      const { data: ind } = await svc.from("industries").select("label, ai_context").eq("key", industryKey).maybeSingle();
      if (ind) { industryLabel = ind.label; industryContext = ind.ai_context ?? ""; }
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "anthropic_key_missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // RAG retrieval (tenant-scoped + global)
    const query = `${caseRow.product_category ?? ""} ${caseRow.product_name ?? ""}\nKundenforderung: ${caseRow.claimed_amount} EUR bei Kaufpreis ${caseRow.purchase_price_total} EUR\nSituation: ${caseRow.situation_text ?? ""}`.slice(0, 6000);

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
          if (pol && pol.length) {
            policyContext = (pol as any[]).map((r, i) => `[Richtlinie ${i + 1}] ${r.content}`).join("\n\n");
          }
          const { data: glob } = await svc.rpc("match_knowledge", {
            query_embedding: vec(emb), match_count: 6, filter_books: null,
          });
          if (glob && glob.length) {
            globalContext = (glob as any[]).map((r, i) => `[Quelle ${i + 1}] ${r.book_title}${r.chapter ? " · " + r.chapter : ""}\n${r.content}`).join("\n\n");
          }
        }
      }
    } catch (e) { console.warn("rag error", e); }

    const systemPrompt = `Du bist Pallanx Retail Shield — ein ELITE-VERHANDLER auf Diplomaten-Niveau, kompromisslos auf der Seite des HÄNDLERS (Verkäufers). Dein Ziel: das wirtschaftlich BESTE Ergebnis für den Händler. Du beherrschst tactical empathy (Chris Voss), Anchoring, Framing, Reziprozität und spieltheoretische Verhandlungsführung und setzt sie konsequent für den Händler ein.

LEITSPRUCH: "Tatlı dil yılanı deliğinden çıkarır" — eine sanfte Zunge lockt die Schlange aus ihrem Loch. Mit überlegener, höflicher Rhetorik führst du den Kunden dazu, die für den Händler günstigste Lösung FREIWILLIG zu wählen und sich dabei als Gewinner zu fühlen.

ROTE LINIE (NICHT VERHANDELBAR):
- Du steuerst die WAHL des Kunden durch überlegenes Framing — du täuschst NIEMALS über die Rechtslage.
- Behaupte NIE wahrheitswidrig, der Kunde habe ein Recht nicht.
- Verschweige zustehende Rechte NICHT auf ausdrückliche Nachfrage.
- Halte den Kunden NICHT durch Falschaussagen von der Rechtsausübung ab.
- Deine Macht liegt in der besseren Argumentation, nicht in Täuschung (§ 123 BGB, § 5 UWG).

RECHTLICHE HEBEL DES HÄNDLERS (immer mitdenken & nutzen):
- § 439 BGB Nacherfüllungsvorrang (Reparatur/Austausch geht Minderung/Rücktritt vor)
- § 323 Abs. 5 BGB: Unerheblichkeit (kein Rücktritt bei unerheblichem Mangel)
- § 439 Abs. 4 BGB: Unverhältnismäßigkeit der Nacherfüllungsart
- § 440 BGB: Rücktritt erst nach fehlgeschlagener Nacherfüllung
- § 477 BGB: Beweislastumkehr nur in den ersten 12 Monaten
- § 438 BGB: Verjährung (i. d. R. 2 Jahre)
- § 442 BGB: Ausschluss bei Kenntnis des Mangels

HEBEL-PRIORISIERUNG (zwingend):
- Stütze deine Argumentation gegenüber dem Kunden PRIMÄR auf die robustesten, unstrittigen Hebel — insbesondere den Nacherfüllungsvorrang (§ 439 BGB) und die Voraussetzung einer fehlgeschlagenen Nacherfüllung vor Rücktritt/Minderung (§ 440 BGB). Solange Nachbesserung möglich und nicht versucht wurde, ist Rücktritt regelmäßig ausgeschlossen — das trägt den Fall meist allein.
- Streitbare, einzelfallabhängige Einstufungen (z. B. ob ein sichtbarer Mangel an hochwertiger Neuware "unerheblich" i.S.d. § 323 Abs. 5 BGB ist, Schwellen der Unverhältnismäßigkeit nach § 439 IV, Auslegung von § 442 bei grenzwertiger Kenntnis) NIEMALS als "eindeutig", "klar" oder "zweifellos" darstellen.
- Wenn ein robusterer Hebel den Fall ohnehin trägt: streitbare Punkte WEGLASSEN.
- Wenn ein streitbarer Punkt erwähnt werden muss: ausdrücklich als "im Einzelfall strittig / gerichtlich nicht einheitlich beurteilt" kennzeichnen — sowohl in legal_position als auch in legal_levers der gewählten Option. In customer_wording / email_draft streitbare Punkte nur in vorsichtiger Form ("kann im Einzelfall anders bewertet werden"); Hauptargument bleibt der Nacherfüllungsvorrang.
- Begründung: Eine forsche, angreifbare Rechtsbehauptung schwächt die Verhandlungsposition und gefährdet den Händler im Streitfall. Das widerspricht dem Schutzziel des Tools.

VORGEHEN (in dieser Reihenfolge):
1. Analysiere präzise: Was schuldet der Händler RECHTLICH wirklich? Welche Hebel greifen?
2. Entwickle DREI strategisch GESTAFFELTE Lösungslinien — KEINE Geld-Achse, sondern eine STRATEGIE-Achse:
   (a) "optimal_for_merchant": die rhetorisch-strategisch beste Linie, die den Kunden zur HÄNDLERGÜNSTIGSTEN Lösung führt (z. B. kostenlose Reparatur als sofortige, bequeme Lösung geframt). Maximal attraktiv für den Kunden geframt: Schnelligkeit, kein Warten, persönliche Wertschätzung. KEIN Zugeständnis über das gesetzlich Geschuldete hinaus, wenn nicht nötig.
   (b) "balanced": händlergünstige Lösung + KLEINE Reziprozitäts-Geste (z. B. Pflegeset, kleiner Gutschein, kostenfreie Lieferung) zur Absicherung der Kundenzufriedenheit.
   (c) "relationship_protection": bewusst großzügigere Linie für Bewertungs-/Stammkunden-Risiko — klar als strategische GESCHÄFTSENTSCHEIDUNG gekennzeichnet, nicht als Rechtspflicht.
3. Jede Option enthält fertigen, höflichen, wertschätzenden Kundentext nach dem Prinzip "tatlı dil" — und einen vollständigen E-Mail-Entwurf.
4. Empfehle standardmäßig Option (a). Nur wenn rechtlich klar (z. B. zweite Nacherfüllung fehlgeschlagen → § 440) oder wirtschaftlich zwingend (öffentliche Eskalation droht, Stammkunde mit hohem CLV), empfiehl (b) oder (c) und begründe transparent.

BRANCHE: ${industryLabel}
${industryContext ? "Branchenspezifische Leitplanken:\n" + industryContext + "\n" : ""}

ROLLEN & LIMITS (in % vom Kaufpreis):
- Sachbearbeiter: bis ${limits.sachbearbeiter_max_percent}%
- Manager: bis ${limits.manager_max_percent}%
- Leitung: bis ${limits.leitung_max_percent}%
${customRolesText ? "Zusätzliche firmeninterne Rollen:\n" + customRolesText + "\n" : ""}
Kulanzregeln dieses Mandanten:
${kulanzRules || "(keine — branchenüblich)"}

${policyContext ? "MANDANTEN-RICHTLINIEN (RAG):\n" + policyContext + "\n\n" : ""}${globalContext ? "VERHANDLUNGSWISSEN (RAG):\n" + globalContext : ""}

SPRACHE: interne Strategie-Sprache klar verkäuferorientiert/durchsetzungsstark; an den Endkunden gerichtete Texte (customer_wording, email_draft) IMMER höflich, wertschätzend, wahrheitsgemäß. Keine Formulierungen wie "abwimmeln/abblocken/loswerden".

PFLICHT — KUNDEN-KOMMUNIKATION (NICHT VERHANDELBAR):
- customer_wording UND email_draft sind in JEDER der drei Optionen PFLICHT und müssen vollständig ausformuliert sein, auch wenn customer_concession_eur = 0.
- Bei 0-€-Strategien (reine Nacherfüllung/Begutachtung): höflicher Deeskalations-Text mit Anerkennung der Emotion + konkretem nächsten Schritt (z. B. kostenfreier Techniker-/Begutachtungs-Termin) + freundlicher Abschluss.
- email_draft enthält Anrede, Fließtext-Hauptteil, konkreten Lösungsvorschlag/nächsten Schritt, höfliche Grußformel. Mindestens 200 Zeichen.
- customer_wording ist ein kompakter Wortlaut (mind. 60 Zeichen) für die mündliche/kurze schriftliche Antwort.
- Leere, einsilbige oder nur platzhalterhafte Felder sind unzulässig.

KOSTEN-TRENNUNG (zwingend, pro Option):
- customer_concession_eur: das, was der KUNDE tatsächlich als Geld/Gutschein/Wertausgleich erhält. Bei reiner Nacherfüllung / Reparatur / Austausch ohne Auszahlung an den Kunden ist dieser Wert IMMER 0.
- merchant_internal_cost_eur: rein INTERNE Umsetzungskosten für den Händler (Reparaturkosten, Anfahrt, Ersatzteil, Logistik). Reine Entscheidungs-Info — wird dem KUNDEN niemals genannt.
- goodwill_beyond_legal_eur bezieht sich ausschließlich auf customer_concession_eur (Anteil über das gesetzlich Geschuldete hinaus).
- percent_of_purchase wird AUSSCHLIESSLICH aus customer_concession_eur / Kaufpreis berechnet (interne Kosten zählen NICHT).
- customer_wording und email_draft dürfen NUR das tatsächliche Kunden-Zugeständnis kommunizieren — niemals interne Kosten oder Reparatur-Aufwand in EUR.
- Approval-Limits (required_role) beziehen sich nur auf customer_concession_eur.`;

    const userPrompt = `Reklamationsfall:
- Produkt: ${caseRow.product_name ?? "n/a"} (Kategorie: ${caseRow.product_category ?? "n/a"})
- Kaufpreis gesamt: ${caseRow.purchase_price_total} EUR (Menge: ${caseRow.quantity})
- Kundenforderung: ${caseRow.claimed_amount} EUR
- Kanal: ${caseRow.channel}
- Kundentyp: ${caseRow.customer_type ?? "unbekannt"}
- Situation:
${caseRow.situation_text ?? "(keine Beschreibung)"}
- Notizen: ${caseRow.notes ?? "-"}

Erzeuge eine EINZIGE faire Empfehlung mit Begründung und E-Mail-Entwurf.`;

    const userPromptExtra = `\nAktueller Mitarbeiter-Rolle: ${userRole} (eigene Obergrenze ${userLimit}%).

Liefere die DREI strategisch gestaffelten Optionen (optimal_for_merchant / balanced / relationship_protection) mit Begründung, BGB-Hebeln, Kundentext und E-Mail-Entwurf. Empfehle standardmäßig Option (a) — abweichen NUR mit transparenter Begründung.`;
    const toolRes = await callAnthropicTool({
      apiKey: anthropicKey,
      systemPrompt,
      userMessage: userPrompt + userPromptExtra,
      maxTokens: 3500,
      tool: {
        name: "return_retail_strategy",
        description: "Return the three strategically tiered Retail-Shield options as strict JSON.",
        input_schema: {
          type: "object",
          properties: {
            analysis: { type: "string", description: "Rechtliche Einordnung + Verhandlungssituation, 3-5 Sätze." },
            legal_position: { type: "string", description: "Was schuldet der Händler rechtlich wirklich? Welche BGB-Hebel greifen? 2-4 Sätze." },
            risk_assessment: { type: "string" },
            options: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  strategy_key: { type: "string", enum: ["optimal_for_merchant", "balanced", "relationship_protection"] },
                  strategy_label: { type: "string" },
                  customer_concession_eur: { type: "number", description: "Was der KUNDE als Geld/Gutschein/Wertausgleich tatsächlich erhält. Reine Reparatur/Nacherfüllung = 0." },
                  merchant_internal_cost_eur: { type: "number", description: "Interne Umsetzungskosten für den Händler (Reparatur, Anfahrt, Ersatzteil). Niemals an Kunde kommunizieren." },
                  percent_of_purchase: { type: "number", description: "customer_concession_eur / Kaufpreis * 100. Interne Kosten zählen NICHT." },
                  goodwill_beyond_legal_eur: { type: "number", description: "Anteil des Kundenzugeständnisses über das gesetzlich Geschuldete hinaus." },
                  legal_levers: { type: "array", items: { type: "string" }, description: "Genutzte BGB-Hebel z. B. ['§ 439 Nacherfüllungsvorrang']." },
                  rationale: { type: "string", description: "Verhandlungslogik, warum genau diese Linie — KEINE Begründung über 'Limit erlaubt es'." },
                  customer_wording: { type: "string", minLength: 60, description: "Höflicher Wortlaut an Kunde (2-4 Sätze, mind. 60 Zeichen). PFLICHT — auch bei 0-€-Strategien (Deeskalation + nächster Schritt). Enthält NIEMALS interne Kosten / Reparaturaufwand in EUR." },
                  email_draft: { type: "string", minLength: 200, description: "Vollständige E-Mail an Kunde mit Anrede, Hauptteil, Lösungsvorschlag, Grußformel (mind. 200 Zeichen). PFLICHT. Enthält NIEMALS interne Kosten / Reparaturaufwand in EUR." },
                  required_role: { type: "string", enum: ["sachbearbeiter", "manager", "leitung"] },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["strategy_key", "strategy_label", "customer_concession_eur", "merchant_internal_cost_eur", "percent_of_purchase", "goodwill_beyond_legal_eur", "legal_levers", "rationale", "customer_wording", "email_draft", "required_role", "confidence"],
                additionalProperties: false,
              },
            },
            recommended_option_index: { type: "integer", minimum: 0, maximum: 2, description: "Empfohlener Index (0 = optimal_for_merchant ist Default)." },
            recommendation_rationale: { type: "string", description: "Warum diese Option empfohlen wird — besonders bei Abweichung von Option 0." },
          },
          required: ["analysis", "legal_position", "risk_assessment", "options", "recommended_option_index", "recommendation_rationale"],
          additionalProperties: false,
        },
      },
    });
    if (!toolRes.ok) {
      return new Response(JSON.stringify({ error: "ai_failed", detail: toolRes.error?.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed: any = toolRes.data;

    const options: any[] = Array.isArray(parsed.options) ? parsed.options : [];
    const recIdx = Math.min(Math.max(Number(parsed.recommended_option_index ?? 0), 0), Math.max(options.length - 1, 0));
    let recommended = options[recIdx] ?? options[0] ?? null;

    if (!recommended) {
      recommended = {
        strategy_key: "optimal_for_merchant",
        strategy_label: "Kostenfreie Begutachtung als erster Schritt",
        customer_concession_eur: 0,
        merchant_internal_cost_eur: 0,
        percent_of_purchase: 0,
        goodwill_beyond_legal_eur: 0,
        legal_levers: ["§ 439 BGB Nacherfüllungsvorrang", "§ 440 BGB Rücktritt erst nach fehlgeschlagener Nacherfüllung"],
        rationale: parsed.recommendation_rationale || parsed.analysis || "Zunächst muss die Ursache geklärt werden; die händlergünstigste faire Linie ist eine kostenfreie Begutachtung mit anschließender Nacherfüllung.",
        required_role: "sachbearbeiter",
        confidence: "medium",
      };
      options.push(recommended);
    }

    // Fallback: ensure customer_wording + email_draft for the recommended option.
    const needsWording = !!recommended && (
      !recommended.customer_wording || String(recommended.customer_wording).trim().length < 60 ||
      !recommended.email_draft || String(recommended.email_draft).trim().length < 200
    );
    if (needsWording) {
      const fillerSystem = `Du bist Pallanx Retail Shield. Formuliere für eine bereits beschlossene Verhandlungslinie zwei Texte an einen Endkunden. Höflich, wertschätzend, wahrheitsgemäß. Niemals interne Kosten / Reparaturaufwand in EUR nennen. Bei 0-€-Strategien: Emotion anerkennen + konkreten nächsten Schritt (z. B. kostenfreier Techniker-/Begutachtungs-Termin) anbieten. Antworte ausschließlich mit reinem JSON {"customer_wording":"...","email_draft":"..."} (ohne Codeblock).`;
      const fillerUser = `Fall: ${caseRow.product_name ?? "n/a"} (${caseRow.product_category ?? "n/a"}), Kaufpreis ${caseRow.purchase_price_total} EUR, Kundenforderung ${caseRow.claimed_amount} EUR.\nSituation: ${caseRow.situation_text ?? "—"}\n\nGewählte Strategie: ${recommended.strategy_label ?? recommended.strategy_key ?? "Empfehlung"}\nKundenzugeständnis: ${Number(recommended.customer_concession_eur ?? 0)} EUR (${Number(recommended.percent_of_purchase ?? 0)}%)\nBegründung intern: ${recommended.rationale ?? ""}\nRechtliche Hebel: ${(recommended.legal_levers ?? []).join(", ")}\n\ncustomer_wording: mind. 60 Zeichen, 2-4 Sätze.\nemail_draft: mind. 200 Zeichen, mit Anrede, Hauptteil, Lösungsvorschlag, Grußformel.`;
      const filler = await callAnthropicText({ apiKey: anthropicKey, systemPrompt: fillerSystem, userMessage: fillerUser, maxTokens: 900 });
      if (filler.ok) {
        try {
          const txt = filler.text.replace(/^```json\s*|\s*```$/g, "").trim();
          const j = extractJsonObject(txt);
          if (j.customer_wording) recommended.customer_wording = String(j.customer_wording);
          if (j.email_draft) recommended.email_draft = String(j.email_draft);
          if (options[recIdx]) options[recIdx] = recommended;
        } catch (e) { console.warn("filler parse failed", e); }
      }
    }

    const fallbackText = defaultCustomerText(caseRow, recommended);
    if (!recommended.customer_wording || String(recommended.customer_wording).trim().length < 60) {
      recommended.customer_wording = fallbackText.customer_wording;
    }
    if (!recommended.email_draft || String(recommended.email_draft).trim().length < 200) {
      recommended.email_draft = fallbackText.email_draft;
    }
    options[recIdx] = recommended;

    let requiredRole: Role = "sachbearbeiter";
    if (recommended) {
      const r = String(recommended.required_role || "sachbearbeiter") as Role;
      requiredRole = (["sachbearbeiter","manager","leitung"] as Role[]).includes(r) ? r : "sachbearbeiter";
      // server-side limit re-check
      const pct = Number(recommended.percent_of_purchase) || 0;
      if (pct > (limits.manager_max_percent ?? 25)) requiredRole = "leitung";
      else if (pct > (limits.sachbearbeiter_max_percent ?? 10)) requiredRole = requiredRole === "leitung" ? "leitung" : "manager";
    }

    const needsEscalation = roleRank[requiredRole] > roleRank[userRole];
    const newStatus = needsEscalation ? "waiting_approval" : "in_review";

    const concessionOf = (o: any) => Number(o?.customer_concession_eur ?? o?.amount_eur ?? 0);
    const recConcession = recommended ? concessionOf(recommended) : null;

    await svc.from("business_cases").update({
      ai_analysis: {
        analysis: parsed.analysis,
        legal_position: parsed.legal_position,
        risk_assessment: parsed.risk_assessment,
        recommendation_rationale: parsed.recommendation_rationale,
      },
      ai_options: options,
      suggested_offer: recConcession,
      suggested_offer_percent: recommended?.percent_of_purchase ?? null,
      required_approval_role: requiredRole,
      status: newStatus,
    }).eq("id", case_id);

    const response = new Response(JSON.stringify({
      ok: true, options, recommended, required_role: requiredRole,
      escalated: needsEscalation, analysis: parsed.analysis, risk_assessment: parsed.risk_assessment,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Defer non-critical writes so the HTTP response flushes immediately.
    // @ts-ignore — Supabase Edge Runtime global
    EdgeRuntime.waitUntil((async () => {
      try {
        const { data: existingV1 } = await svc.from("business_case_versions")
          .select("id").eq("case_id", case_id).eq("kind", "initial").maybeSingle();
        let versionId = existingV1?.id ?? null;
        if (!versionId) {
          const { data: v1 } = await svc.from("business_case_versions").insert({
            case_id, business_account_id: caseRow.business_account_id,
            version_number: 1, kind: "initial",
            user_prompt: null,
            ai_analysis: {
              analysis: parsed.analysis,
              legal_position: parsed.legal_position,
              risk_assessment: parsed.risk_assessment,
              recommendation_rationale: parsed.recommendation_rationale,
            },
            ai_options: options,
            recommended_index: options.length ? recIdx : null,
            required_role: requiredRole,
            created_by_user_id: userId,
          }).select("id").single();
          versionId = v1?.id ?? null;
        }
        if (versionId) {
          await svc.from("business_cases").update({ current_version_id: versionId }).eq("id", case_id);
        }
      } catch (e) { console.warn("v1 snapshot failed", e); }

      try {
        await svc.from("business_case_logs").insert({
          case_id, business_account_id: caseRow.business_account_id, user_id: userId,
          action: "ai_suggestion", system_suggestion: parsed,
        });
      } catch (e) { console.warn("log insert failed", e); }

      if (needsEscalation && recommended) {
        try {
          await svc.from("business_approvals").insert({
            case_id, business_account_id: caseRow.business_account_id,
            requested_by_user_id: userId, requested_by_role: userRole, required_role: requiredRole,
            requested_amount: recConcession ?? 0,
            requested_percent: recommended.percent_of_purchase ?? 0,
            ai_recommendation: recommended,
            justification: parsed.analysis ?? "",
          });
        } catch (e) { console.warn("approval insert failed", e); }
      }
    })());

    return response;
  } catch (e) {
    console.error("pipeline error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});