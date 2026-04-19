import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  BillingCycle,
  Plan,
  PlanFeature,
  PlanPrice,
  PlanWithDetails,
} from "@/types/pricing";

export type { BillingCycle, Plan, PlanPrice, PlanFeature, PlanWithDetails };

const PLANS_QUERY_KEY = ["plans"] as const;

async function fetchPlans(): Promise<PlanWithDetails[]> {
  const [plansRes, pricesRes, featuresRes] = await Promise.all([
    supabase
      .from("plans" as never)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("plan_prices" as never)
      .select("*")
      .eq("is_active", true),
    supabase
      .from("plan_features" as never)
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (plansRes.error) throw plansRes.error;
  if (pricesRes.error) throw pricesRes.error;
  if (featuresRes.error) throw featuresRes.error;

  const plans = (plansRes.data ?? []) as unknown as Plan[];
  const prices = (pricesRes.data ?? []) as unknown as PlanPrice[];
  const features = (featuresRes.data ?? []) as unknown as PlanFeature[];

  return plans.map((plan) => ({
    ...plan,
    prices: prices.filter((p) => p.plan_id === plan.id),
    features: features
      .filter((f) => f.plan_id === plan.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export function usePlans() {
  return useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function formatPrice(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  const symbol = currency === "EUR" ? "€" : currency + " ";
  if (Number.isInteger(amount)) {
    return `${symbol}${amount.toFixed(0)}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

export function getPriceForCycle(
  plan: PlanWithDetails,
  cycle: BillingCycle,
): PlanPrice | undefined {
  return plan.prices.find((p) => p.billing_cycle === cycle);
}
