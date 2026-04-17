import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";

const Settings = () => {
  const [aggressive, setAggressive] = useState(true);
  const [archive, setArchive] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

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

          <div className="border border-border/30 p-5 rounded-sm">
            <p className="font-mono-label text-muted-foreground mb-3">Status Quo</p>
            <div className="flex items-center justify-between text-xs font-sans uppercase tracking-[0.18em] mb-2">
              <span className="text-muted-foreground">KI-Streitwert</span>
              <span className="text-primary">8.2M / 10M</span>
            </div>
            <div className="h-0.5 bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: "82%" }} />
            </div>
          </div>
        </aside>

        {/* Profile content */}
        <section>
          <div className="flex items-start justify-between mb-12">
            <h1 className="font-serif text-5xl">Profil-Parameter</h1>
            <span className="font-mono-label text-muted-foreground">Zuletzt aktualisiert: 12. Okt</span>
          </div>

          <div className="grid md:grid-cols-[160px_1fr] gap-8 mb-12">
            <div className="text-center">
              <div className="aspect-square bg-muted border border-border/40 rounded-sm flex items-center justify-center mb-3">
                <span className="font-serif text-5xl text-muted-foreground/40">A</span>
              </div>
              <button className="font-mono-label text-muted-foreground hover:text-primary">Ändern Sie Ihren Avatar</button>
            </div>

            <div className="space-y-8">
              <div>
                <label className="font-mono-label text-muted-foreground">Vollständiger Name</label>
                <input defaultValue="Alexander von Habsburg" className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-serif text-xl focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="font-mono-label text-muted-foreground">E-Mail-Adresse (Readonly)</label>
                <input readOnly defaultValue="alexander.v@strategos.elite" className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-serif text-xl text-muted-foreground" />
              </div>
              <div>
                <label className="font-mono-label text-muted-foreground">Organisation</label>
                <input defaultValue="Sovereign Strategic Holdings" className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-serif text-xl focus:border-primary focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-card border border-border/40 rounded-sm p-8 mb-12">
            <p className="font-mono-label text-primary mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Aktuelles Mandat: Elite-Diplomat
            </p>
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
              <div>
                <h3 className="font-serif text-2xl leading-snug mb-8 max-w-lg">
                  Profitieren Sie von unbegrenzter KI-Analyse und priorisierter Strategie-Erstellung.
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="font-mono-label text-muted-foreground mb-2">Nächste Abrechnung</p>
                    <p className="font-serif italic text-xl">01. November 2023</p>
                  </div>
                  <div>
                    <p className="font-mono-label text-muted-foreground mb-2">Gebühr</p>
                    <p className="font-serif italic text-xl">499,00 € / Monat</p>
                  </div>
                </div>
              </div>
              <div className="text-right space-y-3">
                <Button variant="gold" onClick={() => setShowUpgrade(true)}>Plan ändern</Button>
                <button className="block ml-auto font-mono-label text-muted-foreground hover:text-primary underline underline-offset-4">
                  Rechnungsverlauf ansehen
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
            <button className="font-mono-label text-muted-foreground hover:text-foreground">Abbrechen</button>
            <Button variant="gold-outline" size="lg">Änderungen speichern</Button>
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
