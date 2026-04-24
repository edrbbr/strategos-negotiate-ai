import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import {
  formatPrice,
  getPriceForCycle,
  type BillingCycle,
  type PlanWithDetails,
} from "@/hooks/usePlans";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const lookupKeyFor = (planId: string, cycle: BillingCycle): string | null => {
  if (planId === "pro") return cycle === "yearly" ? "pro_yearly" : "pro_monthly";
  if (planId === "elite")
    return cycle === "yearly" ? "elite_yearly" : "elite_monthly";
  return null;
};

const ctaLabelFor = (planId: string, isAuthed: boolean): string => {
  if (planId === "free") return isAuthed ? "DOSSIER STARTEN" : "KOSTENLOS STARTEN";
  if (planId === "elite") return "ELITE FREISCHALTEN";
  return "JETZT SICHERN";
};

export interface PlanCardProps {
  plan: PlanWithDetails;
  cycle: BillingCycle;
  onCheckout: (planId: string, cycle: BillingCycle) => void;
  pendingPriceId: string | null;
  isAuthed: boolean;
  freeCtaTo: string;
}

export const PlanCard = ({
  plan,
  cycle,
  onCheckout,
  pendingPriceId,
  isAuthed,
  freeCtaTo,
}: PlanCardProps) => {
  const price = getPriceForCycle(plan, cycle);
  const monthly = getPriceForCycle(plan, "monthly");
  const featured = plan.is_recommended;
  const lookupKey = lookupKeyFor(plan.id, cycle);
  const isFree = plan.id === "free";
  const isPending = lookupKey !== null && pendingPriceId === lookupKey;

  const showEffective = cycle === "yearly" && price && price.amount_cents > 0;
  const effectivePerMonth = showEffective
    ? formatPrice(Math.round(price!.amount_cents / 12), price!.currency)
    : null;

  return (
    <div
      className={`relative p-8 border ${
        featured ? "border-primary bg-card" : "border-border/40 bg-card/40"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-mono-label px-3 py-1">
          {plan.badge}
        </span>
      )}
      <p className="font-mono-label text-muted-foreground mb-2">
        {plan.tier_label}
      </p>
      <h3 className="font-serif text-2xl mb-2">{plan.name}</h3>
      {plan.tagline && (
        <p className="text-sm text-muted-foreground mb-6">{plan.tagline}</p>
      )}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-serif text-5xl">
          {price ? formatPrice(price.amount_cents, price.currency) : "—"}
        </span>
        <span className="text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground">
          / {cycle === "monthly" ? "Monat" : "Jahr"}
        </span>
      </div>
      {effectivePerMonth ? (
        <p className="text-xs text-muted-foreground/60 mb-8 font-sans">
          Effektiv {effectivePerMonth} / Monat
        </p>
      ) : (
        <div className="mb-8" />
      )}
      <ul className="space-y-3 mb-8">
        {plan.features.map((f) => (
          <li
            key={f.id}
            className={`flex items-start gap-3 text-sm text-foreground/80 ${
              f.is_highlight ? "font-semibold text-foreground" : ""
            }`}
          >
            <Check
              className="w-4 h-4 text-primary shrink-0 mt-0.5"
              strokeWidth={2}
            />
            {f.feature_text}
          </li>
        ))}
      </ul>
      {isFree ? (
        <Link to={freeCtaTo}>
          <Button
            variant={featured ? "gold" : "gold-outline"}
            className="w-full"
            size="lg"
          >
            {ctaLabelFor(plan.id, isAuthed)}
          </Button>
        </Link>
      ) : (
        <Button
          variant={featured ? "gold" : "gold-outline"}
          className="w-full"
          size="lg"
          disabled={isPending || !lookupKey}
          onClick={() => onCheckout(plan.id, cycle)}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              LADEN…
            </>
          ) : (
            ctaLabelFor(plan.id, isAuthed)
          )}
        </Button>
      )}
      {monthly && cycle === "yearly" && monthly.amount_cents > 0 && (
        <p className="mt-3 text-[10px] text-muted-foreground/60 text-center font-sans uppercase tracking-[0.18em]">
          Statt {formatPrice(monthly.amount_cents, monthly.currency)} / Monat
        </p>
      )}
    </div>
  );
};

export interface PlansGridProps {
  plans: PlanWithDetails[];
  showCycleToggle?: boolean;
  successReturnPath?: string;
}

const calcYearlyDiscount = (plans: PlanWithDetails[]): number | null => {
  const pro = plans.find((p) => p.id === "pro");
  if (!pro) return null;
  const monthly = getPriceForCycle(pro, "monthly");
  const yearly = getPriceForCycle(pro, "yearly");
  if (!monthly || !yearly || monthly.amount_cents === 0) return null;
  const effective = yearly.amount_cents / 12;
  const pct = Math.round((1 - effective / monthly.amount_cents) * 100);
  return pct > 0 ? pct : null;
};

export const PlansGrid = ({
  plans,
  showCycleToggle = true,
  successReturnPath = "/app/dashboard",
}: PlansGridProps) => {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } =
    useStripeCheckout();
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);

  const discount = calcYearlyDiscount(plans);
  const isAuthed = !!user;
  const freeCtaTo = isAuthed ? "/app/case/new" : "/register";

  const handleCheckout = (planId: string, c: BillingCycle) => {
    const priceId = lookupKeyFor(planId, c);
    if (!priceId) return;
    if (!user) {
      navigate(
        `/register?intent=checkout&price_id=${encodeURIComponent(priceId)}`,
      );
      return;
    }
    setPendingPriceId(priceId);
    openCheckout({
      priceId,
      customerEmail: user.email ?? profile?.full_name ?? undefined,
      returnUrl: `${window.location.origin}${successReturnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <>
      {showCycleToggle && (
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-3 border border-border/40 p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-5 py-2 text-xs font-sans uppercase tracking-[0.2em] transition-colors ${
                cycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`px-5 py-2 text-xs font-sans uppercase tracking-[0.2em] transition-colors ${
                cycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Jährlich
              {discount !== null && (
                <span className="ml-2 text-tertiary">−{discount}%</span>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            onCheckout={handleCheckout}
            pendingPriceId={pendingPriceId}
            isAuthed={isAuthed}
            freeCtaTo={freeCtaTo}
          />
        ))}
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCheckout();
            setPendingPriceId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-background border border-primary/30 p-6">
          <VisuallyHidden>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Sicheres Bezahlen über Stripe.</DialogDescription>
          </VisuallyHidden>
          {checkoutElement}
        </DialogContent>
      </Dialog>
    </>
  );
};
