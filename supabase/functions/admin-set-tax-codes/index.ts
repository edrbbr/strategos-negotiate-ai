import { createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripe = createStripeClient("sandbox");
    const TAX_CODE = "txcd_10103001";
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "list";

    if (mode === "list") {
      const products = await stripe.products.list({ limit: 100 });
      return new Response(JSON.stringify({
        ok: true,
        products: products.data.map((p) => ({ id: p.id, name: p.name, tax_code: p.tax_code })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // mode=apply
    const products = await stripe.products.list({ limit: 100 });
    const results: Record<string, unknown> = {};
    for (const p of products.data) {
      const name = (p.name ?? "").toLowerCase();
      if (name.includes("pro") || name.includes("elite") || name.includes("strategos")) {
        const updated = await stripe.products.update(p.id, { tax_code: TAX_CODE });
        results[p.id] = { name: updated.name, tax_code: updated.tax_code };
      }
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
