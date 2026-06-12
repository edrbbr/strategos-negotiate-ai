import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAnthropicTool } from "../_shared/anthropic.ts";

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

    const { case_id, instruction } = await req.json();
    if (!case_id || !instruction || String(instruction).trim().length < 2) {
      return new Response(JSON.stringify({ error: "case_id and instruction required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    // load latest version (current_version_id or highest version_number)
    const { data: latestVersion } = await svc.from("business_case_versions")
      .select("*").eq("case_id", case_id).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const baseAnalysis = latestVersion?.ai_analysis ?? caseRow.ai_analysis ?? {};
    const baseOptions = (latestVersion?.ai_options ?? caseRow.ai_options ?? []) as any[];

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

    const systemPrompt = `Du bist Pallanx Retail Shield. Du verfeinerst die bestehende EINZIGE Empfehlung gemäß Anweisung des Mitarbeitenden.
REGEL: Liefere wieder GENAU EINE Empfehlung — kein Optionen-Set. Limits sind Obergrenzen, nicht Default. Faire, rechtssichere, branchenrealistische Verhandlung.

BRANCHE: ${industryLabel}
${industryContext ? "Branchenleitplanken:\n" + industryContext + "\n" : ""}

Limits (% vom Kaufpreis): Sachbearbeiter ${limits.sachbearbeiter_max_percent}% · Manager ${limits.manager_max_percent}% · Leitung ${limits.leitung_max_percent}%
Kulanzregeln: ${kulanzRules || "(branchenüblich)"}

${policyContext ? "MANDANTEN-RICHTLINIEN:\n" + policyContext + "\n\n" : ""}${globalContext ? "VERHANDLUNGSWISSEN:\n" + globalContext : ""}

Antworte AUSSCHLIESSLICH mit gültigem JSON:
{
  "analysis": "Aktualisierte Kurzanalyse",
  "risk_assessment": "Aktualisierte Risiken",
  "recommendation": {
    "amount_eur": 0, "percent_of_purchase": 0,
    "rationale": "...", "customer_wording": "...", "email_draft": "...",
    "required_role": "sachbearbeiter|manager|leitung", "confidence": "low|medium|high"
  },
  "change_summary": "Was wurde gegenüber der Vorversion geändert (1-2 Sätze)"
}`;

    const userPrompt = `Reklamationsfall:
- Produkt: ${caseRow.product_name ?? "n/a"} (${caseRow.product_category ?? "n/a"})
- Kaufpreis: ${caseRow.purchase_price_total} EUR · Menge ${caseRow.quantity}
- Kundenforderung: ${caseRow.claimed_amount} EUR
- Situation: ${caseRow.situation_text ?? "—"}

VORHERIGE ANALYSE: ${JSON.stringify(baseAnalysis)}
VORHERIGE EMPFEHLUNG: ${JSON.stringify(baseOptions[0] ?? null)}

ANWEISUNG DES MITARBEITENDEN: ${instruction}

Passe die Empfehlung entsprechend an und erkläre kurz die Änderung.`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "anthropic_key_missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const toolRes = await callAnthropicTool({
      apiKey: anthropicKey,
      systemPrompt,
      userMessage: userPrompt,
      maxTokens: 3000,
      tool: {
        name: "return_retail_refinement",
        description: "Return the updated single Retail-Shield recommendation as strict JSON.",
        input_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            risk_assessment: { type: "string" },
            recommendation: {
              type: "object",
              properties: {
                amount_eur: { type: "number" },
                percent_of_purchase: { type: "number" },
                rationale: { type: "string" },
                customer_wording: { type: "string" },
                email_draft: { type: "string" },
                required_role: { type: "string", enum: ["sachbearbeiter", "manager", "leitung"] },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["amount_eur", "percent_of_purchase", "rationale", "customer_wording", "email_draft", "required_role", "confidence"],
              additionalProperties: false,
            },
            change_summary: { type: "string" },
          },
          required: ["analysis", "risk_assessment", "recommendation", "change_summary"],
          additionalProperties: false,
        },
      },
    });
    if (!toolRes.ok) {
      return new Response(JSON.stringify({ error: "ai_failed", detail: toolRes.error?.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed: any = toolRes.data;

    const recommended = parsed.recommendation ?? null;
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

    // determine next version_number
    const nextNum = (latestVersion?.version_number ?? 0) + 1;

    const { data: newVersion, error: insErr } = await svc.from("business_case_versions").insert({
      case_id, business_account_id: caseRow.business_account_id,
      version_number: nextNum, kind: "refinement",
      user_prompt: instruction,
      ai_analysis: { analysis: parsed.analysis, risk_assessment: parsed.risk_assessment, change_summary: parsed.change_summary },
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
      suggested_offer: recommended?.amount_eur ?? null,
      suggested_offer_percent: recommended?.percent_of_purchase ?? null,
      required_approval_role: requiredRole,
    }).eq("id", case_id);

    await svc.from("business_case_logs").insert({
      case_id, business_account_id: caseRow.business_account_id, user_id: userId,
      action: "refinement", system_suggestion: { instruction, result: parsed },
    });

    return new Response(JSON.stringify({
      ok: true, version: newVersion, options, recommended,
      required_role: requiredRole,
      escalated: roleRank[requiredRole] > roleRank[userRole],
      change_summary: parsed.change_summary ?? null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("refine error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});