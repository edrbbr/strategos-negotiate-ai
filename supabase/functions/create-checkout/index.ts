import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const {
      priceId,
      quantity,
      customerEmail,
      returnUrl,
      environment,
    } = body as {
      priceId?: string;
      quantity?: number;
      customerEmail?: string;
      returnUrl?: string;
      environment?: StripeEnv;
    };

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return json({ error: "Invalid priceId" }, 400);
    }
    if (!returnUrl) {
      return json({ error: "Missing returnUrl" }, 400);
    }
    if (environment !== "sandbox" && environment !== "live") {
      return json({ error: "Invalid environment" }, 400);
    }

    // Optional auth: if Authorization header present, verify and use that user
    let resolvedUserId: string | undefined;
    let resolvedEmail: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsError } =
        await supabase.auth.getClaims(token);
      if (claimsError || !claims?.claims?.sub) {
        return json({ error: "Unauthorized" }, 401);
      }
      resolvedUserId = claims.claims.sub;
      if (claims.claims.email) {
        resolvedEmail = claims.claims.email as string;
      }
    } else {
      // Anonymous checkout: only body-supplied email is allowed; no userId.
      if (customerEmail) resolvedEmail = customerEmail;
    }

    const stripe = createStripeClient(environment);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return json({ error: "Price not found for lookup key " + priceId }, 404);
    }
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const session = await stripe.checkout.sessions.create({
      line_items: [
        { price: stripePrice.id, quantity: quantity || 1 },
      ],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: returnUrl,
      managed_payments: { enabled: true },
      ...(resolvedEmail && { customer_email: resolvedEmail }),
      ...(resolvedUserId && {
        metadata: {
          userId: resolvedUserId,
          lookupKey: priceId,
          quantity: String(quantity || 1),
        },
        ...(isRecurring && {
          subscription_data: { metadata: { userId: resolvedUserId } },
        }),
      }),
    });

    return json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("create-checkout error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, 400);
  }
});