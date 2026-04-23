import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Diamond, Loader2 } from "lucide-react";
import strategosLogo from "@/assets/strategos-logo.svg";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import {
  formatPrice,
  getPriceForCycle,
  usePlans,
  type PlanWithDetails,
} from "@/hooks/usePlans";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TierCard = ({
  plan,
  featured,
}: {
  plan: PlanWithDetails;
  featured: boolean;
}) => {
  const price = getPriceForCycle(plan, "monthly");
  const features = plan.features.slice(0, 3);

  return (
    <div
      className={`relative p-6 border rounded-sm ${
        featured
          ? "border-primary/40 bg-background"
          : "border-border/40 bg-background/40"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 right-4 bg-primary text-primary-foreground font-mono-label px-3 py-1">
          EMPFEHLUNG
        </span>
      )}
      <div className="flex items-baseline justify-between mb-6">
        <span className="font-mono-label text-foreground">{plan.name}</span>
        <span className="font-mono-label text-muted-foreground">
          {price ? formatPrice(price.amount_cents, price.currency) : "—"} /
          Monat
        </span>
      </div>
      <ul className="space-y-3">
        {features.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 font-serif text-sm"
          >
            <Diamond
              className="w-3 h-3 text-primary shrink-0"
              fill="currentColor"
            />
            {f.feature_text}
          </li>
        ))}
      </ul>
    </div>
  );
};

const SkeletonTierCard = () => (
  <div className="p-6 border border-border/40 bg-background/40 rounded-sm space-y-4">
    <div className="flex justify-between">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-4/6" />
  </div>
);

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const { data: plans, isLoading, isError, refetch } = usePlans();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } =
    useStripeCheckout();
  const [pending, setPending] = useState(false);
  const upgradePlans = (plans ?? []).filter(
    (p) => p.id === "pro" || p.id === "elite",
  );

  const handleUpgrade = () => {
    const priceId = "pro_monthly";
    if (!user) {
      onOpenChange(false);
      navigate(`/register?intent=checkout&price_id=${priceId}`);
      return;
    }
    setPending(true);
    openCheckout({
      priceId,
      customerEmail: user.email ?? undefined,
      returnUrl: `${window.location.origin}/app/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border border-primary/30 rounded-sm p-12">
        <div className="text-center mb-10">
          <img
            src={strategosLogo}
            alt="Strategos"
            className="w-12 h-12 mx-auto mb-6 rounded-sm"
          />
          <h2 className="font-serif italic text-3xl mb-4">
            Limit erreicht. Du hast deine 3 kostenlosen Fälle verwendet.
          </h2>
          <p className="font-serif italic text-muted-foreground max-w-lg mx-auto">
            Setzen Sie Ihre strategische Überlegenheit fort. Wählen Sie einen
            Plan, um weitere Verhandlungen zu führen.
          </p>
        </div>

        {isLoading && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <SkeletonTierCard />
            <SkeletonTierCard />
          </div>
        )}

        {isError && (
          <div className="text-center py-8 mb-4">
            <p className="font-serif italic text-sm text-muted-foreground mb-4">
              Preisinformationen vorübergehend nicht verfügbar. Bitte Seite neu
              laden.
            </p>
            <Button
              variant="gold-outline"
              size="sm"
              onClick={() => refetch()}
            >
              Erneut versuchen
            </Button>
          </div>
        )}

        {!isLoading && !isError && upgradePlans.length === 0 && (
          <div className="text-center py-8 mb-4">
            <p className="font-serif italic text-sm text-muted-foreground">
              Preisinformationen vorübergehend nicht verfügbar.
            </p>
          </div>
        )}

        {!isLoading && !isError && upgradePlans.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {upgradePlans.map((plan) => (
              <TierCard
                key={plan.id}
                plan={plan}
                featured={plan.id === "elite"}
              />
            ))}
          </div>
        )}

        <Button
          variant="gold"
          size="xl"
          className="w-full mb-3"
          onClick={handleUpgrade}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              CHECKOUT WIRD GEÖFFNET…
            </>
          ) : (
            "PRO WERDEN"
          )}
        </Button>
        <button
          onClick={() => onOpenChange(false)}
          className="block mx-auto font-serif italic text-sm text-muted-foreground hover:text-primary"
        >
          Vielleicht später
        </button>
      </DialogContent>
    </Dialog>
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          closeCheckout();
          setPending(false);
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
    </>
  );
};
