import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient<any>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<any>(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function readableId(item: any): string {
  return item?.price?.metadata?.lovable_external_id || item?.price?.id;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Only handle one-time payment (mode === "payment"); subscriptions are covered separately.
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;

  const userId = session.metadata?.userId;
  const lookupKey = session.metadata?.lookupKey;
  if (!userId || lookupKey !== "extra_dossier_single") return;

  // Quantity from line items (managed-payments stores it on the session line items).
  // We stored the quantity in metadata for safety.
  const qty = Math.max(1, Math.min(10, parseInt(session.metadata?.quantity ?? "1", 10) || 1));
  const amountCents = session.amount_total ?? qty * 499;
  const currency = (session.currency ?? "eur").toUpperCase();

  // Get the user's current period_end so credits expire with the period
  const { data: profile } = await getSupabase()
    .from("profiles")
    .select("id, extra_credits")
    .eq("id", userId)
    .maybeSingle();

  const { data: sub } = await getSupabase()
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", userId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile) {
    console.warn("Extra-dossier purchase without profile", userId);
    return;
  }

  // Idempotency: skip if we already booked this session
  const { data: existing } = await getSupabase()
    .from("extra_credit_purchases")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) {
    console.log("Extra-dossier session already booked", session.id);
    return;
  }

  await getSupabase().from("extra_credit_purchases").insert({
    user_id: userId,
    quantity: qty,
    amount_cents: amountCents,
    currency,
    status: "completed",
    stripe_session_id: session.id,
    expires_at: sub?.current_period_end ?? null,
  });

  await getSupabase()
    .from("profiles")
    .update({
      extra_credits: (profile.extra_credits ?? 0) + qty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  console.log(`Booked ${qty} extra dossiers for user ${userId}`);
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = readableId(item);
  const productId = item?.price?.product;
  const periodStart =
    item?.current_period_start ?? subscription.current_period_start;
  const periodEnd =
    item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = readableId(item);
  const productId = item?.price?.product;
  const periodStart =
    item?.current_period_start ?? subscription.current_period_start;
  const periodEnd =
    item?.current_period_end ?? subscription.current_period_end;

  // Use upsert so updates work even if create event was missed.
  const userId = subscription.metadata?.userId;
  await getSupabase().from("subscriptions").upsert(
    {
      ...(userId && { user_id: userId }),
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook with invalid env:", rawEnv);
    return new Response(
      JSON.stringify({ received: true, ignored: "invalid env" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});