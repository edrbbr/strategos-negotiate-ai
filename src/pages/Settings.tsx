import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink, Loader2 } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice, getPriceForCycle, usePlans } from "@/hooks/usePlans";
import { getStripeEnvironment } from "@/lib/stripe";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { data: plans } = usePlans();

  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [aggressive, setAggressive] = useState(false);
  const [archive, setArchive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const isPaidPlan =
    profile?.plan_id === "pro" || profile?.plan_id === "elite";

  const openPortal = async () => {
    setOpeningPortal(true);
    const { data, error } = await supabase.functions.invoke(
      "create-portal-session",
      {
        body: {
          returnUrl: `${window.location.origin}/app/settings`,
          environment: getStripeEnvironment(),
        },
      },
    );
    setOpeningPortal(false);
    if (error || !data?.url) {
      toast.error(
        `Portal konnte nicht geöffnet werden: ${error?.message ?? "unbekannt"}`,
      );
      return;
    }
    window.location.href = data.url as string;
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setOrganization(profile.organization ?? "");
      setAggressive(profile.aggressive_mode);
      setArchive(profile.archive_mode);
    }
  }, [profile]);

  const planFromList = plans?.find((p) => p.id === profile?.plan_id);
  const cycle = (profile?.billing_cycle as "monthly" | "yearly") ?? "monthly";
  const priceObj = planFromList ? getPriceForCycle(planFromList, cycle) : undefined;
  const priceLabel = priceObj
    ? `${formatPrice(priceObj.amount_cents, priceObj.currency)} / ${cycle === "yearly" ? "Jahr" : "Monat"}`
    : "—";

  const planDisplayName = profile?.plan?.tier_label
    ? `${profile.plan.name}-${profile.plan.tier_label.charAt(0) + profile.plan.tier_label.slice(1).toLowerCase()}`
    : "—";

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        organization,
        aggressive_mode: aggressive,
        archive_mode: archive,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success("Änderungen gespeichert.");
    refreshProfile();
  };

  const onCancel = () => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setOrganization(profile.organization ?? "");
      setAggressive(profile.aggressive_mode);
      setArchive(profile.archive_mode);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="grid lg:grid-cols-[260px_1fr] gap-12">
        {/* Side nav */}
        <aside>
          <p className="font-mono-label text-muted-foreground mb-6">Einstellungen</p>
          <ul className="space-y-3 mb-10">
            {[
              { label: "Profil", active: true },
              { label: "Plan & Abrechnung" },
              { label: "Benachrichtigungen" },
              { label: "Sicherheit" },
            ].map((item) => (
              <li key={item.label}>
                <button className={`flex items-center gap-2 font-mono-label text-left ${item.active ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors`}>
                  {item.active && <span className="text-primary">◆</span>}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {profile?.plan?.case_limit !== null && profile?.plan?.case_limit !== undefined && (
            <div className="border border-border/30 p-5 rounded-sm">
              <p className="font-mono-label text-muted-foreground mb-3">Status Quo</p>
              <div className="flex items-center justify-between text-xs font-sans uppercase tracking-[0.18em] mb-2">
                <span className="text-muted-foreground">Fälle</span>
                <span className="text-primary">
                  {profile.cases_used} / {profile.plan.case_limit}
                </span>
              </div>
              <div className="h-0.5 bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(100, Math.round((profile.cases_used / profile.plan.case_limit) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* Profile content */}
        <section>
          <div className="flex items-start justify-between mb-12">
            <h1 className="font-serif text-5xl">Profil-Parameter</h1>
            <span className="font-mono-label text-muted-foreground">
              Identität verifiziert
            </span>
          </div>

          <div className="grid md:grid-cols-[160px_1fr] gap-8 mb-12">
            <div className="text-center">
              <div className="aspect-square bg-muted border border-border/40 rounded-sm flex items-center justify-center mb-3">
                <span className="font-serif text-5xl text-muted-foreground/40">
                  {(fullName || user?.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <button className="font-mono-label text-muted-foreground hover:text-primary">
                Avatar (bald verfügbar)
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <label className="font-mono-label text-muted-foreground">Vollständiger Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-serif text-xl focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="font-mono-label text-muted-foreground">E-Mail-Adresse (Readonly)</label>
                <input
                  readOnly
                  value={user?.email ?? ""}
                  className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-serif text-xl text-muted-foreground"
                />
              </div>
              <div>
                <label className="font-mono-label text-muted-foreground">Organisation</label>
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Sovereign Strategic Holdings"
                  className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-serif text-xl focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-card border border-border/40 rounded-sm p-8 mb-12">
            <p className="font-mono-label text-primary mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Aktuelles Mandat: {planDisplayName}
            </p>
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
              <div>
                <h3 className="font-serif text-2xl leading-snug mb-8 max-w-lg">
                  {planFromList?.tagline ?? "Profitieren Sie von strategischer KI-Analyse."}
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="font-mono-label text-muted-foreground mb-2">Status</p>
                    <p className="font-serif italic text-xl capitalize">
                      {profile?.subscription_status ?? "active"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono-label text-muted-foreground mb-2">Gebühr</p>
                    <p className="font-serif italic text-xl">{priceLabel}</p>
                  </div>
                </div>
              </div>
              <div className="text-right space-y-3">
                {isPaidPlan ? (
                  <Button
                    variant="gold"
                    onClick={openPortal}
                    disabled={openingPortal}
                  >
                    {openingPortal ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Plan verwalten
                  </Button>
                ) : (
                  <Button variant="gold" onClick={() => navigate("/preise")}>
                    Jetzt upgraden
                  </Button>
                )}
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="block ml-auto font-mono-label text-muted-foreground hover:text-primary underline underline-offset-4"
                >
                  Upgrade-Optionen
                </button>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <p className="font-mono-label text-muted-foreground mb-4">Strategische Präferenzen</p>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-card border border-border/30 p-6 rounded-sm flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-lg mb-2">Aggressive Verhandlungsführung</p>
                <p className="font-mono-label text-muted-foreground/70">KI-Agent tendiert zu risikoreichen Manövern</p>
              </div>
              <Toggle checked={aggressive} onChange={setAggressive} />
            </div>
            <div className="bg-card border border-border/30 p-6 rounded-sm flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-lg mb-2">Vertraulicher Archiv-Modus</p>
                <p className="font-mono-label text-muted-foreground/70">Alle Falldaten werden nach 30 Tagen gelöscht</p>
              </div>
              <Toggle checked={archive} onChange={setArchive} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-6">
            <button onClick={onCancel} className="font-mono-label text-muted-foreground hover:text-foreground">
              Abbrechen
            </button>
            <Button variant="gold-outline" size="lg" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Änderungen speichern
            </Button>
          </div>
        </section>
      </div>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${checked ? "translate-x-6" : "translate-x-0.5"}`} />
  </button>
);

export default Settings;
