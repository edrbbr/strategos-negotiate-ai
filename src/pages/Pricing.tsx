import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  formatPrice,
  getPriceForCycle,
  usePlans,
  type BillingCycle,
  type PlanWithDetails,
} from "@/hooks/usePlans";

const lookupKeyFor = (planId: string, cycle: BillingCycle): string | null => {
  if (planId === "pro") return cycle === "yearly" ? "pro_yearly" : "pro_monthly";
  if (planId === "elite")
    return cycle === "yearly" ? "elite_yearly" : "elite_monthly";
  return null;
};

const ctaLabelFor = (planId: string, opts?: { isAuthed?: boolean }): string => {
  if (planId === "free") {
    return opts?.isAuthed ? "FALL STARTEN" : "KOSTENLOS STARTEN";
  }
  if (planId === "elite") return "ELITE FREISCHALTEN";
  return "JETZT SICHERN";
};

const calcYearlyDiscount = (plans: PlanWithDetails[]): number | null => {
  const pro = plans.find((p) => p.id === "pro");
  if (!pro) return null;
  const monthly = getPriceForCycle(pro, "monthly");
  const yearly = getPriceForCycle(pro, "yearly");
  if (!monthly || !yearly || monthly.amount_cents === 0) return null;
  const effectiveMonthly = yearly.amount_cents / 12;
  const pct = Math.round((1 - effectiveMonthly / monthly.amount_cents) * 100);
  return pct > 0 ? pct : null;
};

const PlanCard = ({
  plan,
  cycle,
  onCheckout,
  pendingPriceId,
  isAuthed,
  freeCtaTo,
}: {
  plan: PlanWithDetails;
  cycle: BillingCycle;
  onCheckout: (planId: string, cycle: BillingCycle) => void;
  pendingPriceId: string | null;
  isAuthed: boolean;
  freeCtaTo: string;
}) => {
  const price = getPriceForCycle(plan, cycle);
  const monthly = getPriceForCycle(plan, "monthly");
  const featured = plan.is_recommended;
  const lookupKey = lookupKeyFor(plan.id, cycle);
  const isFree = plan.id === "free";
  const isPending = lookupKey !== null && pendingPriceId === lookupKey;

  const showEffective =
    cycle === "yearly" && price && price.amount_cents > 0;
  const effectivePerMonth = showEffective
    ? formatPrice(Math.round((price!.amount_cents / 12)), price!.currency)
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
            {ctaLabelFor(plan.id, { isAuthed })}
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
            ctaLabelFor(plan.id, { isAuthed })
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

const SkeletonCard = () => (
  <div className="p-8 border border-border/40 bg-card/40 space-y-6">
    <Skeleton className="h-3 w-16" />
    <Skeleton className="h-7 w-24" />
    <Skeleton className="h-12 w-32" />
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
    <Skeleton className="h-11 w-full" />
  </div>
);

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="text-center py-16">
    <p className="font-serif italic text-lg text-muted-foreground mb-6">
      Preisinformationen vorübergehend nicht verfügbar. Bitte Seite neu laden.
    </p>
    <Button variant="gold-outline" onClick={onRetry}>
      Erneut versuchen
    </Button>
  </div>
);

const Pricing = () => {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const { data: plans, isLoading, isError, refetch } = usePlans();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } =
    useStripeCheckout();
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);

  const discount = plans ? calcYearlyDiscount(plans) : null;

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
      returnUrl: `${window.location.origin}/app/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const isAuthed = !!user;
  const freeCtaTo = isAuthed ? "/app/case/new" : "/register";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container flex items-center justify-between py-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-10 font-sans uppercase tracking-[0.18em] text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <Link to="/preise" className="text-primary">
            Preise
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="font-sans uppercase tracking-[0.2em] text-xs text-muted-foreground hover:text-primary"
          >
            Login
          </Link>
          <Link to="/register">
            <Button variant="gold-outline" size="sm">
              Start Negotiation
            </Button>
          </Link>
        </div>
      </header>

      <section className="container py-20 text-center">
        <p className="font-mono-label text-primary mb-6">◆ Preise</p>
        <h1 className="font-serif text-5xl md:text-6xl mb-6">
          Wählen Sie Ihre <span className="italic text-primary">Kapazität</span>
        </h1>
        <p className="max-w-xl mx-auto text-muted-foreground mb-10">
          Drei Tarife — kompromisslos kalkuliert für Anwender, die das
          Verhandlungsergebnis nicht dem Zufall überlassen.
        </p>

        <div className="inline-flex items-center gap-3 border border-border/40 p-1 mb-2">
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
      </section>

      <section className="container pb-24">
        {isLoading && (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && plans && plans.length === 0 && (
          <ErrorState onRetry={() => refetch()} />
        )}
        {!isLoading && !isError && plans && plans.length > 0 && (
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
        )}
      </section>

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
            <DialogDescription>
              Sicheres Bezahlen über Stripe.
            </DialogDescription>
          </VisuallyHidden>
          {checkoutElement}
        </DialogContent>
      </Dialog>

      <footer className="container py-10 border-t border-border/40 flex flex-col md:flex-row gap-4 justify-between items-center text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground">
        <Logo />
        <span>© 2024 Strategos Elite System</span>
      </footer>
    </div>
  );
};

export default Pricing;
