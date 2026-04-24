import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Crown, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { EliteRequestModal } from "@/components/EliteRequestModal";
import { Skeleton } from "@/components/ui/skeleton";

const PRO_BENEFITS = [
  "Tiefenanalyse jeder Verhandlung in unter 30 Sekunden",
  "20 Dossiers pro Monat – mehr als jeder Wettbewerber liefert",
  "Zusatz-Dossiers à 4,99 € nachkaufbar, jederzeit",
];

const ELITE_BENEFITS = [
  "Multi-Stage-KI-Pipeline – jede Phase von einem spezialisierten Modell",
  "Unbegrenzte Dossiers ohne Monatszähler",
  "Priority Strategien-Engine: Harvard, Voss, Ackerman, BATNA orchestriert",
  "Persönlicher Zugang nach Eignungsprüfung",
];

export const MandateBlock = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [openingPortal, setOpeningPortal] = useState(false);
  const [eliteOpen, setEliteOpen] = useState(false);

  const planId = profile?.plan_id;
  const limit = profile?.plan?.case_limit;
  const used = profile?.cases_used ?? 0;
  const extra = profile?.extra_credits ?? 0;
  const remainingQuota = limit !== null && limit !== undefined ? Math.max(0, limit - used) : null;

  const openPortal = async () => {
    setOpeningPortal(true);
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: {
        returnUrl: `${window.location.origin}/app/billing`,
        environment: getStripeEnvironment(),
      },
    });
    setOpeningPortal(false);
    if (error || !data?.url) {
      toast.error(`Portal konnte nicht geöffnet werden: ${error?.message ?? "unbekannt"}`);
      return;
    }
    window.open(data.url as string, "_blank");
  };

  // ============ LOADING SKELETON ============
  if (!profile) {
    return (
      <div className="bg-card border border-primary/20 rounded-sm p-8 space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-48 mt-4" />
      </div>
    );
  }

  // ============ FREE PLAN ============
  if (planId === "free") {
    const exhausted = remainingQuota === 0;
    return (
      <div className="bg-card border border-primary/30 rounded-sm p-8">
        <p className="font-mono-label text-primary mb-4 flex items-center gap-2">
          <Award className="w-4 h-4" />
          Aktuelles Mandat: Free
        </p>
        {exhausted ? (
          <h3 className="font-serif text-2xl md:text-3xl leading-snug mb-4">
            Ihr Free-Kontingent ist aufgebraucht.
            <span className="block text-muted-foreground text-lg mt-2 font-sans not-italic">
              Pro-Anwender verhandeln gerade weiter.
            </span>
          </h3>
        ) : (
          <h3 className="font-serif text-2xl md:text-3xl leading-snug mb-4">
            Sie haben noch{" "}
            <span className="text-primary">{remainingQuota}</span> von {limit}{" "}
            Dossier{limit === 1 ? "" : "s"} frei.
          </h3>
        )}
        <ul className="space-y-2 mb-8">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex gap-3 text-foreground/80 text-[15px] leading-7">
              <span className="text-primary mt-1.5">◆</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button variant="gold" size="lg" onClick={() => navigate("/preise")}>
          Jetzt zu Pro upgraden — bevor Wettbewerber es tun
        </Button>
      </div>
    );
  }

  // ============ PRO PLAN ============
  if (planId === "pro") {
    return (
      <>
        <div className="bg-card border border-border/40 rounded-sm p-8 mb-8">
          <p className="font-mono-label text-primary mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Aktuelles Mandat: Pro
          </p>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="font-mono-label text-muted-foreground mb-2">Dossiers diesen Monat</p>
              <p className="font-serif text-3xl">
                {used}<span className="text-muted-foreground/60 text-2xl"> / {limit}</span>
                {extra > 0 && (
                  <span className="ml-3 text-base font-sans text-primary">
                    +{extra} extra
                  </span>
                )}
              </p>
              {remainingQuota === 0 && extra === 0 && (
                <p className="font-mono-label text-primary mt-3">Mandat vollständig genutzt</p>
              )}
            </div>
            <div className="text-right">
              <Button variant="gold-outline" onClick={openPortal} disabled={openingPortal}>
                {openingPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Plan verwalten
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/40 rounded-sm p-8">
          <p className="font-mono-label text-primary mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Elite — Imperialer Zugang
          </p>
          <h3 className="font-serif text-2xl md:text-3xl leading-snug mb-6 max-w-xl">
            Für Akteure, die jede Verhandlung als strategisches Manöver führen.
          </h3>
          <ul className="space-y-2 mb-8">
            {ELITE_BENEFITS.map((b) => (
              <li key={b} className="flex gap-3 text-foreground/85 text-[15px] leading-7">
                <span className="text-primary mt-1.5">◆</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="font-mono-label text-muted-foreground mb-4">
            Limitierte Aufnahme. Nur nach persönlicher Eignungsprüfung.
          </p>
          <Button variant="gold" size="lg" onClick={() => setEliteOpen(true)}>
            Zugang anfragen
          </Button>
        </div>

        <EliteRequestModal open={eliteOpen} onOpenChange={setEliteOpen} />
      </>
    );
  }

  // ============ ELITE PLAN ============
  return (
    <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/40 rounded-sm p-8">
      <p className="font-mono-label text-primary mb-4 flex items-center gap-2">
        <Crown className="w-4 h-4" />
        Imperialer Zugang aktiv
      </p>
      <h3 className="font-serif text-3xl md:text-4xl leading-snug mb-4">
        Unbegrenzte Dossiers. Volle Pipeline.
      </h3>
      <p className="text-foreground/80 text-[15px] leading-7 mb-6 max-w-xl">
        Sie verhandeln im obersten Tier. Multi-Stage-Pipeline aktiv,
        Priority-Strategien orchestriert, kein Monatszähler.
      </p>
      <Button variant="gold-outline" onClick={openPortal} disabled={openingPortal}>
        {openingPortal ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <ExternalLink className="w-4 h-4 mr-2" />
        )}
        Plan verwalten
      </Button>
    </div>
  );
};