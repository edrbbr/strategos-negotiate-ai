export type BillingCycle = "monthly" | "yearly";

export type CaseLimitType = "lifetime" | "monthly" | "unlimited";

export interface Plan {
  id: string;
  name: string;
  tier_label: string;
  tagline: string | null;
  badge: string | null;
  model_id: string;
  case_limit: number | null;
  case_limit_type: CaseLimitType;
  sort_order: number;
  is_active: boolean;
  is_recommended: boolean;
  created_at: string;
  updated_at: string;
  /** Functional tier: "free" | "pro" | "elite". */
  tier_key?: string;
  bookable_directly?: boolean;
  initial_attachments_limit?: number;
  refinement_attachments_limit?: number;
  refinements_per_case?: number | null;
  refinements_per_month?: number | null;
  allows_tonality?: boolean;
  allows_deep_doc_analysis?: boolean;
  support_sla_hours?: number | null;
}

export interface PlanPrice {
  id: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  amount_cents: number;
  currency: string;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_text: string;
  sort_order: number;
  is_highlight: boolean;
  created_at: string;
  help_text?: string | null;
}

export interface PlanWithDetails extends Plan {
  prices: PlanPrice[];
  features: PlanFeature[];
}
