import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlans } from "@/hooks/usePlans";
import { PlansGrid } from "@/components/pricing/PlanCard";

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
      <PublicHeader active="preise" />

      <section className="container py-20 text-center">
        <p className="font-mono-label text-primary mb-6">◆ Preise</p>
        <h1 className="font-serif text-5xl md:text-6xl mb-6">
          Wählen Sie Ihre <span className="italic text-primary">Kapazität</span>
        </h1>
        <p className="max-w-xl mx-auto text-muted-foreground mb-2">
          Drei Tarife — kompromisslos kalkuliert für Anwender, die das
          Verhandlungsergebnis nicht dem Zufall überlassen.
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
