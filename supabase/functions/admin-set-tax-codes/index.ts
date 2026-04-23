import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripe = createStripeClient("sandbox");
    const TAX_CODE = "txcd_10103001"; // SaaS - cloud-based
    const results: Record<string, unknown> = {};
    for (const id of ["pro_plan", "elite_plan"]) {
      const updated = await stripe.products.update(id, { tax_code: TAX_CODE });
      results[id] = { id: updated.id, tax_code: updated.tax_code };
    }
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
