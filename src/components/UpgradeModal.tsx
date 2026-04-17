import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hexagon, Diamond } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border border-primary/30 rounded-sm p-12">
        <div className="text-center mb-10">
          <Hexagon className="w-10 h-10 text-primary mx-auto mb-6" strokeWidth={1.2} />
          <h2 className="font-serif italic text-3xl mb-4">
            Limit erreicht. Du hast deine 3 kostenlosen Fälle verwendet.
          </h2>
          <p className="font-serif italic text-muted-foreground max-w-lg mx-auto">
            Setzen Sie Ihre strategische Überlegenheit fort. Wählen Sie einen Plan, um weitere Verhandlungen zu führen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {[
            { name: "Pro", price: "€49", features: ["Unbegrenzte Fallanalysen", "Erweiterte Taktik-Modelle", "Export-Funktion (PDF/XLS)"] },
            { name: "Elite", price: "€129", featured: true, features: ["Echtzeit-Coaching via API", "Deep-Psychology Engine", "Multi-User Dashboard"] },
          ].map((tier) => (
            <div key={tier.name} className={`relative p-6 border rounded-sm ${tier.featured ? "border-primary/40 bg-background" : "border-border/40 bg-background/40"}`}>
              {tier.featured && (
                <span className="absolute -top-3 right-4 bg-primary text-primary-foreground font-mono-label px-3 py-1">Empfehlung</span>
              )}
              <div className="flex items-baseline justify-between mb-6">
                <span className="font-mono-label text-foreground">{tier.name}</span>
                <span className="font-mono-label text-muted-foreground">{tier.price} / Monat</span>
              </div>
              <ul className="space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 font-serif text-sm">
                    <Diamond className="w-3 h-3 text-primary shrink-0" fill="currentColor" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Button variant="gold" size="xl" className="w-full mb-3">Pro werden</Button>
        <button onClick={() => onOpenChange(false)} className="block mx-auto font-serif italic text-sm text-muted-foreground hover:text-primary">
          Vielleicht später
        </button>
      </DialogContent>
    </Dialog>
  );
};
