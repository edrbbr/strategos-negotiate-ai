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
      discountCode,
    } = body as {
      priceId?: string;
      quantity?: number;
      customerEmail?: string;
      returnUrl?: string;
      environment?: StripeEnv;
      discountCode?: string;
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

    // Resolve plan_id + cycle from lookup key for discount validation
    let planId: string | null = null;
    let billingCycle: string | null = null;
    if (priceId.startsWith("pro_")) planId = "pro";
    else if (priceId.startsWith("elite_")) planId = "elite";
    if (priceId.endsWith("_monthly")) billingCycle = "monthly";
    else if (priceId.endsWith("_yearly")) billingCycle = "yearly";

    let appliedCouponId: string | null = null;
    let appliedDiscountCodeId: string | null = null;
    let appliedDiscountCode: string | null = null;
    if (discountCode && resolvedUserId && planId && billingCycle) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: validation, error: vErr } = await supabaseAdmin.rpc(
        "validate_discount_code",
        {
          p_user_id: resolvedUserId,
          p_code: discountCode,
          p_plan_id: planId,
          p_billing_cycle: billingCycle,
        },
      );
      if (vErr) {
        console.error("validate_discount_code error:", vErr);
        return json({ error: "Discount validation failed" }, 400);
      }
      const v = validation as Record<string, unknown> | null;
      if (!v?.valid) {
        return json(
          {
            error: "INVALID_DISCOUNT",
            reason: (v?.reason as string) ?? "unknown",
          },
          400,
        );
      }
      appliedDiscountCodeId = (v.code_id as string) ?? null;
      appliedDiscountCode = (v.code as string) ?? null;
      const couponLookup =
        environment === "sandbox"
          ? (v.stripe_coupon_id_sandbox as string | null)
          : (v.stripe_coupon_id_live as string | null);
      if (couponLookup) {
        appliedCouponId = couponLookup;
      } else {
        // Create an ad-hoc coupon on the fly if none was pre-provisioned
        const couponPayload: Record<string, unknown> = {
          duration: (v.duration as string) ?? "once",
          name: `Code ${appliedDiscountCode ?? discountCode}`,
        };
        if (v.duration === "repeating" && v.duration_in_months) {
          couponPayload.duration_in_months = v.duration_in_months;
        }
        if (v.percent_off) {
          couponPayload.percent_off = v.percent_off;
        } else if (v.amount_off_cents) {
          couponPayload.amount_off = v.amount_off_cents;
          couponPayload.currency = (v.currency as string)?.toLowerCase() ?? "eur";
        }
        const coupon = await stripe.coupons.create(couponPayload as any);
        appliedCouponId = coupon.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        { price: stripePrice.id, quantity: quantity || 1 },
      ],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: returnUrl,
      managed_payments: { enabled: true },
      ...(appliedCouponId && {
        discounts: [{ coupon: appliedCouponId }],
      }),
      ...(resolvedEmail && { customer_email: resolvedEmail }),
      ...(resolvedUserId && {
        metadata: {
          userId: resolvedUserId,
          lookupKey: priceId,
          quantity: String(quantity || 1),
          ...(appliedDiscountCodeId && {
            discountCodeId: appliedDiscountCodeId,
            discountCode: appliedDiscountCode ?? "",
          }),
        },
        ...(isRecurring && {
          subscription_data: {
            metadata: {
              userId: resolvedUserId,
              ...(appliedDiscountCodeId && {
                discountCodeId: appliedDiscountCodeId,
              }),
            },
          },
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