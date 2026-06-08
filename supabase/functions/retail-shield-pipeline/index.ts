import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_MODEL = "google/gemini-embedding-001";
const CHAT_MODEL = "google/gemini-2.5-flash";

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

    const systemPrompt = `Du bist Pallanx Retail Shield — ein AI-Verhandlungsassistent für rechtssichere und FAIRE Reklamationsbearbeitung im Einzelhandel.

DEINE AUFGABE: Liefere GENAU EINE Empfehlung — den kleinstmöglichen Betrag, mit dem der Kunde sich noch als Gewinner fühlt. Limits sind OBERGRENZEN, nicht Default. Bevorzuge Reparatur > Austausch > Teilgutschrift > Erstattung. Nutze BGB-Hebel und Branchenpraxis.

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

Antworte AUSSCHLIESSLICH mit gültigem JSON nach diesem Schema:
{
  "analysis": "Kurzanalyse 2-4 Sätze: Sachlage, Rechtslage, Branche",
  "risk_assessment": "Risiken (Image, Folgekosten, Präzedenz)",
  "recommendation": {
    "amount_eur": Zahl,
    "percent_of_purchase": Zahl,
    "rationale": "Warum genau dieser Betrag — Verhandlungslogik, BGB-Hebel, Branchenpraxis. KEINE Begründung über 'Limit erlaubt es'.",
    "customer_wording": "Konkreter, höflicher, fairer Wortlaut für Mitarbeitende gegenüber Kunde (2-4 Sätze)",
    "email_draft": "Vollständige E-Mail an Kunde mit Anrede, Inhalt, Grußformel. Tonalität: rechtssicher und fair.",
    "required_role": "sachbearbeiter|manager|leitung",
    "confidence": "low|medium|high"
  }
}`;

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

    const userPromptExtra = `\nAktueller Mitarbeiter-Rolle: ${userRole} (eigene Obergrenze ${userLimit}%).`;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt + userPromptExtra }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: t.slice(0,500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    const recommended = parsed.recommendation ?? null;
    const options = recommended ? [recommended] : [];
    const recIdx = 0;

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

    await svc.from("business_cases").update({
      ai_analysis: { analysis: parsed.analysis, risk_assessment: parsed.risk_assessment },
      ai_options: options,
      suggested_offer: recommended?.amount_eur ?? null,
      suggested_offer_percent: recommended?.percent_of_purchase ?? null,
      required_approval_role: requiredRole,
      status: newStatus,
    }).eq("id", case_id);

    // Write V1 (initial) snapshot for the chat/version timeline
    try {
      const { data: existingV1 } = await svc.from("business_case_versions")
        .select("id").eq("case_id", case_id).eq("kind", "initial").maybeSingle();
      let versionId = existingV1?.id ?? null;
      if (!versionId) {
        const { data: v1 } = await svc.from("business_case_versions").insert({
          case_id, business_account_id: caseRow.business_account_id,
          version_number: 1, kind: "initial",
          user_prompt: null,
          ai_analysis: { analysis: parsed.analysis, risk_assessment: parsed.risk_assessment },
          ai_options: options,
          recommended_index: options.length ? (parsed.recommended_option_index ?? 0) : null,
          required_role: requiredRole,
          created_by_user_id: userId,
        }).select("id").single();
        versionId = v1?.id ?? null;
      }
      if (versionId) {
        await svc.from("business_cases").update({ current_version_id: versionId }).eq("id", case_id);
      }
    } catch (e) { console.warn("v1 snapshot failed", e); }

    await svc.from("business_case_logs").insert({
      case_id, business_account_id: caseRow.business_account_id, user_id: userId,
      action: "ai_suggestion", system_suggestion: parsed,
    });

    if (needsEscalation && recommended) {
      await svc.from("business_approvals").insert({
        case_id, business_account_id: caseRow.business_account_id,
        requested_by_user_id: userId, requested_by_role: userRole, required_role: requiredRole,
        requested_amount: recommended.amount_eur ?? 0,
        requested_percent: recommended.percent_of_purchase ?? 0,
        ai_recommendation: recommended,
        justification: parsed.analysis ?? "",
      });
    }

    return new Response(JSON.stringify({
      ok: true, options, recommended, required_role: requiredRole,
      escalated: needsEscalation, analysis: parsed.analysis, risk_assessment: parsed.risk_assessment,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("pipeline error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});