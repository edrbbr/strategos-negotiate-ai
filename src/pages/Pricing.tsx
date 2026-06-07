import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlans } from "@/hooks/usePlans";
import { PlansGrid } from "@/components/pricing/PlanCard";
import { Seo } from "@/components/Seo";
import { Helmet } from "react-helmet-async";

const PRICING_JSONLD = {
  product: {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Pallanx",
    description:
      "AI-Verhandlungsassistent für Selbständige und Freelancer. Free, Single-Case-Pass, Pro und Elite.",
    brand: { "@type": "Brand", name: "Pallanx" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: "0",
      highPrice: "490",
      offerCount: "4",
      url: "https://pallanx.com/preise",
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR", url: "https://pallanx.com/preise" },
        { "@type": "Offer", name: "Single-Case-Pass", price: "29", priceCurrency: "EUR", url: "https://pallanx.com/preise" },
        { "@type": "Offer", name: "Pro (monatlich)", price: "49", priceCurrency: "EUR", url: "https://pallanx.com/preise" },
        { "@type": "Offer", name: "Pro (jährlich)", price: "490", priceCurrency: "EUR", url: "https://pallanx.com/preise" },
      ],
    },
  },
  breadcrumb: {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Start", item: "https://pallanx.com/" },
      { "@type": "ListItem", position: 2, name: "Preise", item: "https://pallanx.com/preise" },
    ],
  },
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
  const { data: plans, isLoading, isError, refetch } = usePlans();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Preise — PALLANX für Selbständige & Freelancer"
        description="Free, Single-Case-Pass (29 €), Pro (49 €/Monat oder 490 €/Jahr) und Elite auf Anfrage. Kein Risiko, kein Abo-Zwang."
        path="/preise"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(PRICING_JSONLD.product)}</script>
        <script type="application/ld+json">{JSON.stringify(PRICING_JSONLD.breadcrumb)}</script>
      </Helmet>
      <PublicHeader active="preise" />

      <section className="container py-20 text-center">
        <p className="font-mono-label text-primary mb-6">◆ Preise</p>
        <h1 className="font-serif text-5xl md:text-6xl mb-6">
          Wähle, was zu dir <span className="italic text-primary">passt</span>
        </h1>
        <p className="max-w-xl mx-auto text-muted-foreground mb-2">
          Kostenlos starten · einmal zahlen · oder dauerhaft im Pro-Tarif arbeiten.
          Kein Risiko, jederzeit kündbar.
        </p>
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
          <PlansGrid plans={plans} />
        )}
      </section>

      <footer className="container py-10 border-t border-border/40 flex flex-col md:flex-row gap-4 justify-between items-center text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground">
        <Logo />
        <span>© 2026 PALLANX Elite System</span>
      </footer>
    </div>
  );
};

export default Pricing;
