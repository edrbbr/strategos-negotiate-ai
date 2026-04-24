import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans, type PlanWithDetails } from "@/hooks/usePlans";

export type Tier = "free" | "pro" | "elite";

export interface PlanLimits {
  tier: Tier;
  initialAttachmentsLimit: number;
  refinementAttachmentsLimit: number;
  refinementsPerCase: number | null;
  refinementsPerMonth: number | null;
  allowsTonality: boolean;
  allowsDeepDocAnalysis: boolean;
  supportSlaHours: number | null;
  bookableDirectly: boolean;
  caseLimit: number | null;
}

const DEFAULT_LIMITS: PlanLimits = {
  tier: "free",
  initialAttachmentsLimit: 3,
  refinementAttachmentsLimit: 0,
  refinementsPerCase: 3,
  refinementsPerMonth: null,
  allowsTonality: false,
  allowsDeepDocAnalysis: false,
  supportSlaHours: 72,
  bookableDirectly: true,
  caseLimit: 3,
};

function tierFromPlanId(id: string | undefined | null): Tier {
  if (id === "elite") return "elite";
  if (id === "pro") return "pro";
  return "free";
}

function planToLimits(plan: PlanWithDetails | undefined, fallbackTier: Tier): PlanLimits {
  if (!plan) return { ...DEFAULT_LIMITS, tier: fallbackTier };
  return {
    tier: (plan.tier_key as Tier | undefined) ?? fallbackTier,
    initialAttachmentsLimit: plan.initial_attachments_limit ?? DEFAULT_LIMITS.initialAttachmentsLimit,
    refinementAttachmentsLimit:
      plan.refinement_attachments_limit ?? DEFAULT_LIMITS.refinementAttachmentsLimit,
    refinementsPerCase: plan.refinements_per_case ?? null,
    refinementsPerMonth: plan.refinements_per_month ?? null,
    allowsTonality: plan.allows_tonality ?? false,
    allowsDeepDocAnalysis: plan.allows_deep_doc_analysis ?? false,
    supportSlaHours: plan.support_sla_hours ?? null,
    bookableDirectly: plan.bookable_directly ?? true,
    caseLimit: plan.case_limit,
  };
}

/**
 * Returns the live plan limits for the authenticated user.
 * Falls back to safe Free-tier defaults while plans / profile load.
 */
export function usePlanLimits(): PlanLimits {
  const { profile } = useAuth();
  const { data: plans } = usePlans();
  return useMemo(() => {
    const tier = tierFromPlanId(profile?.plan_id);
    const plan = plans?.find((p) => p.id === profile?.plan_id);
    return planToLimits(plan, tier);
  }, [plans, profile?.plan_id]);
}

/** Lookup limits for an arbitrary plan id (used in pricing UI). */
export function planLimitsFor(plans: PlanWithDetails[] | undefined, planId: string): PlanLimits {
  return planToLimits(plans?.find((p) => p.id === planId), tierFromPlanId(planId));
}