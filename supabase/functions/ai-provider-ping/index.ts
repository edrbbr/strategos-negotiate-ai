// Admin-only ping helper: makes a minimal chat call against the requested
// (provider, model) and returns latency + a short sample. Used by the Admin
// AI-Provider page to validate connectivity before flipping the global switch.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callChatText } from "../_shared/aiProvider.ts";

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
    const { data: u, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !u?.user?.id) return json({ error: "Unauthorized" }, 401);

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleCheck } = await service.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    if (roleCheck !== true) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const providerRaw = body?.provider === "kimi" ? "kimi" : "anthropic";
    const model: string =
      typeof body?.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : providerRaw === "kimi"
          ? "kimi-k2-0905-preview"
          : "claude-sonnet-4-5";

    const t0 = Date.now();
    const res = await callChatText({
      provider: providerRaw,
      model,
      systemPrompt:
        "You are a connectivity probe. Reply in two short German sentences confirming you are operational and naming your model.",
      userMessage: "Bitte bestätige kurz, dass du erreichbar bist.",
      maxTokens: 120,
      temperature: 0.3,
      timeoutMs: 30_000,
    });
    const latency_ms = Date.now() - t0;

    if (!res.ok) {
      return json({
        ok: false,
        provider: providerRaw,
        model,
        latency_ms,
        status: res.status,
        error: res.error?.slice(0, 400) ?? "unknown",
      }, 200);
    }
    return json({
      ok: true,
      provider: providerRaw,
      model,
      latency_ms,
      sample: res.text.slice(0, 300),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});