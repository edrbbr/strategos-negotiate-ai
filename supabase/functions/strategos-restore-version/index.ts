// STRATEGOS Restore Version — copies an old version into a new version row (no AI call).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    const { case_id, version_id } = await req.json().catch(() => ({}));
    if (!case_id || !version_id) return json({ error: "case_id and version_id required" }, 400);

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: target, error: tErr } = await service
      .from("case_versions")
      .select("*")
      .eq("id", version_id)
      .eq("case_id", case_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (tErr || !target) return json({ error: "Version not found" }, 404);

    const { data: latest } = await service
      .from("case_versions")
      .select("version_number")
      .eq("case_id", case_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = (latest?.version_number ?? 0) + 1;

    const { data: inserted, error: insErr } = await service
      .from("case_versions")
      .insert({
        case_id,
        user_id: userId,
        version_number: nextNumber,
        kind: "restore",
        user_prompt: `Version ${target.version_number} wiederhergestellt`,
        analysis: target.analysis,
        strategy: target.strategy,
        draft: target.draft,
        strategy_labels: target.strategy_labels,
        model_used: target.model_used,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: "Persist failed" }, 500);

    await service
      .from("cases")
      .update({
        analysis: target.analysis,
        strategy: target.strategy,
        draft: target.draft,
        current_version_id: inserted.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", case_id);

    // Fire-and-forget: regenerate suggestions
    fetch(`${SUPABASE_URL}/functions/v1/strategos-suggest-refinements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ case_id, _internal: true, _user_id: userId }),
    }).catch(() => undefined);

    return json({ ok: true, version_id: inserted.id, version_number: nextNumber });
  } catch (e) {
    console.error("strategos-restore-version error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});