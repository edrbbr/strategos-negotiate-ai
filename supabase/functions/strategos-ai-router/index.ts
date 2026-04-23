// STRATEGOS AI Router — multi-model entrypoint
// Single-Call (Free/Pro) or Multi-Stage Pipeline (Elite) routed by plan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runSingleCall } from "./pipelines/singleCall.ts";
import { isStageFailure, runMultiStagePipeline, type StageCompletePayload } from "./pipelines/multiStage.ts";
import { MOCK_RESPONSE } from "./prompts.ts";
import { ProviderError, type PipelineConfig, type PlanRow, type StageMeta } from "./types.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ---- AUTH ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    // ---- INPUT ----
    const body = await req.json().catch(() => ({}));
    const situation_text: string = body?.situation_text;
    const case_id: string | undefined = body?.case_id;

    if (!situation_text || typeof situation_text !== "string" || situation_text.trim().length < 10) {
      return json({ error: "situation_text muss mindestens 10 Zeichen enthalten." }, 400);
    }

    // ---- PROFILE + PLAN ----
    const { data: profile, error: profileErr } = await userClient
      .from("profiles")
      .select("plan_id, cases_used, plans!inner(id, model_id, case_limit, case_limit_type, pipeline_config)")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profile) {
      console.error("Profile load failed", profileErr);
      return json({ error: "Profile not found" }, 500);
    }

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

    // ---- KEYS ----
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? null;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? null;

    const allKeysMissing = !ANTHROPIC_API_KEY && !OPENAI_API_KEY && !LOVABLE_API_KEY;

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Helper: writes a stage payload to the case row (only if case_id provided)
    const writeStage = async (payload: StageCompletePayload) => {
      if (!case_id) return;
      const update: Record<string, unknown> = { ...payload.data };
      if (payload.stage === "analysis") {
        update.status = "active";
        update.last_analyzed_at = new Date().toISOString();
      }
      const { error } = await serviceClient
        .from("cases")
        .update(update)
        .eq("id", case_id)
        .eq("user_id", userId);
      if (error) console.error("Stage DB update failed", payload.stage, error);
    };

    const incrementCounter = async () => {
      const { data: newCount } = await serviceClient.rpc("increment_cases_used", {
        p_user_id: userId,
      });
      return typeof newCount === "number" ? newCount : profile.cases_used + 1;
    };

    // ---- MOCK FALLBACK (only if every provider key is missing) ----
    if (allKeysMissing) {
      await new Promise((r) => setTimeout(r, 1500));
      const m = MOCK_RESPONSE;
      await writeStage({ stage: "analysis", data: { analysis: m.analysis, model_used: "mock" } });
      await writeStage({ stage: "strategy", data: { strategy: m.strategy } });
      await writeStage({
        stage: "draft",
        data: { title: m.title, icon_hint: m.icon_hint, draft: m.draft, model_used: "mock" },
      });
      const cases_used = await incrementCounter();
      return json({
        ...m,
        model: "mock",
        plan: plan.id,
        cases_used,
        case_limit: plan.case_limit,
        pipeline_meta: null,
      });
    }

    // ---- ROUTE: Multi-Stage vs Single-Call ----
    const pipelineConfig = plan.pipeline_config as PipelineConfig | null;

    if (pipelineConfig && pipelineConfig.type === "multi_stage") {
      // ELITE
      try {
        const t0 = Date.now();
        const { result, stageMetas } = await runMultiStagePipeline({
          config: pipelineConfig,
          situationText: situation_text,
          anthropicKey: ANTHROPIC_API_KEY,
          openaiKey: OPENAI_API_KEY,
          onStageComplete: writeStage,
        });
        const total = Date.now() - t0;
        const cases_used = await incrementCounter();
        return json({
          ...result,
          model: "multi_stage_elite",
          plan: plan.id,
          cases_used,
          case_limit: plan.case_limit,
          pipeline_meta: {
            type: "multi_stage",
            stages: stageMetas,
            total_latency_ms: total,
          },
        });
      } catch (e) {
        if (isStageFailure(e)) {
          const cause = e.cause;
          const code = cause instanceof ProviderError ? cause.code : "STAGE_FAILED";
          const status = cause instanceof ProviderError && cause.status === 429 ? 429 : 502;
          return json(
            {
              error: "STAGE_FAILED",
              code,
              failed_at: e.stage,
              completed_stages: e.completedStages,
              message: cause.message,
            },
            status,
          );
        }
        throw e;
      }
    }

    // FREE / PRO — Single-Call
    try {
      const t0 = Date.now();
      const result = await runSingleCall({
        modelId: plan.model_id,
        situationText: situation_text,
        anthropicKey: ANTHROPIC_API_KEY,
        lovableKey: LOVABLE_API_KEY,
      });
      const total = Date.now() - t0;

      // For single-call we still write the case once, atomically
      await writeStage({ stage: "analysis", data: { analysis: result.analysis, model_used: plan.model_id } });
      await writeStage({ stage: "strategy", data: { strategy: result.strategy } });
      await writeStage({
        stage: "draft",
        data: {
          title: result.title,
          icon_hint: result.icon_hint,
          draft: result.draft,
          model_used: plan.model_id,
        },
      });

      const cases_used = await incrementCounter();
      const stageMetas: StageMeta[] = [
        { stage: "analysis", model: plan.model_id, latency_ms: total },
      ];
      return json({
        ...result,
        model: plan.model_id,
        plan: plan.id,
        cases_used,
        case_limit: plan.case_limit,
        pipeline_meta: {
          type: "multi_stage",
          stages: stageMetas,
          total_latency_ms: total,
        },
      });
    } catch (e) {
      if (e instanceof ProviderError) {
        const status = e.status === 429 ? 429 : e.code.startsWith("MISSING_") ? 500 : 502;
        return json({ error: e.code, message: e.message, provider: e.provider }, status);
      }
      throw e;
    }
  } catch (e) {
    console.error("strategos-ai-router error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});