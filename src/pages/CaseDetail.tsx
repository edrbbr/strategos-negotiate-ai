import { useParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Copy, Send, ChevronDown, Bot, Diamond, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type StrategosResult = {
  analysis: string[];
  strategy: string;
  draft: string;
  model?: string;
  plan?: string;
};

// TODO: replace with the authenticated user's actual plan from the profiles table.
const DUMMY_USER_PLAN: "free" | "pro" | "elite" = "pro";

const CaseDetail = () => {
  const { id } = useParams();
  const [refinement, setRefinement] = useState("");
  const [situation, setSituation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StrategosResult | null>(null);

  const runPipeline = async () => {
    if (situation.trim().length < 10) {
      toast.error("Bitte beschreiben Sie die Situation (mind. 10 Zeichen).");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("strategos-ai-router", {
        body: { situation_text: situation, user_plan: DUMMY_USER_PLAN },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setResult(data as StrategosResult);
      toast.success("Pipeline abgeschlossen");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(`Pipeline-Fehler: ${msg}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center gap-4 mb-8">
        <button className="text-muted-foreground hover:text-primary">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div>
          <p className="font-mono-label text-primary text-sm">Case-ID: {id || "882-X9"}</p>
          <p className="font-mono-label text-muted-foreground/60 mt-1">Initialisierungs-Phase</p>
        </div>
      </div>

      {/* Progress phases */}
      <div className="grid grid-cols-3 gap-2 mb-10">
        <div className="h-1 bg-secondary" />
        <div className="h-1 bg-primary" />
        <div className="h-1 bg-tertiary" />
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Left column */}
        <div className="space-y-8">
          <div>
            <p className="font-mono-label text-primary mb-3">◆ Situationsbeschreibung</p>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Beschreiben Sie hier die aktuelle Verhandlungssituation, die Beteiligten und Ihre bisherigen Schritte…"
              className="w-full min-h-[280px] bg-card border border-border/30 rounded-sm p-5 font-serif italic text-lg text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="font-mono-label text-muted-foreground mb-2">Medium</p>
              <button className="w-full flex items-center justify-between bg-transparent border border-border/40 rounded-sm px-4 py-3 font-mono-label text-foreground hover:border-primary/40 transition-colors">
                E-Mail (Formal) <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="font-mono-label text-muted-foreground mb-2">Sprache</p>
              <button className="w-full flex items-center justify-between bg-transparent border border-border/40 rounded-sm px-4 py-3 font-mono-label text-foreground hover:border-primary/40 transition-colors">
                Deutsch (Hoch) <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <p className="font-mono-label text-muted-foreground mb-2">Referenz-Dokumente</p>
            <div className="border border-dashed border-border/40 rounded-sm py-12 flex flex-col items-center justify-center hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 text-muted-foreground mb-3" strokeWidth={1.5} />
              <p className="font-mono-label text-muted-foreground">PDF, JPG oder PNG hochladen</p>
            </div>
          </div>

          <Button
            variant="gold"
            size="xl"
            className="w-full"
            onClick={runPipeline}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing power dynamics…
              </span>
            ) : (
              <>▸ Pipeline Starten</>
            )}
          </Button>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Analyse */}
          <div className="bg-card border-l-2 border-secondary rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono-label text-secondary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-soft" />
                Analyse-Modul Active
              </p>
              <span className="font-mono-label text-muted-foreground/60">0.4s Latency</span>
            </div>
            <ul className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              <li className="flex gap-3">
                <Diamond className="w-3 h-3 text-secondary mt-1.5 shrink-0" fill="currentColor" />
                <p><strong className="font-semibold">Ziel-Analyse:</strong> Maximierung der kurzfristigen Liquidität bei Erhaltung der langfristigen Lieferantenbeziehung.</p>
              </li>
              <li className="flex gap-3">
                <Diamond className="w-3 h-3 text-secondary mt-1.5 shrink-0" fill="currentColor" />
                <p><strong className="font-semibold">Gegenpartei:</strong> Dominantes Verhalten, Fokus auf Standardisierung. Schwachpunkt: Zeitdruck zum Quartalsende.</p>
              </li>
            </ul>
          </div>

          {/* Strategie */}
          <div className="bg-card border-l-2 border-primary rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono-label text-primary">○ Strategie-Entwurf</p>
              <span className="font-mono-label text-muted-foreground/60">Calculating…</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Wir verfolgen den <em className="text-primary not-italic font-medium">"Anchoring-Pivot"</em>. Wir akzeptieren die technischen Parameter, fordern aber im Gegenzug eine exklusive Revisionsklausel nach 6 Monaten.
            </p>
          </div>

          {/* Final */}
          <div className="bg-card border border-tertiary/30 rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono-label text-tertiary">◆ Finaler Entwurf</p>
              <Button
                variant="gold-outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText("Sehr geehrte Damen und Herren…"); toast.success("Entwurf kopiert"); }}
              >
                <Copy className="w-3 h-3" /> Kopieren
              </Button>
            </div>
            <p className="font-serif italic text-base leading-relaxed text-foreground/90">
              "Sehr geehrte Damen und Herren, wir haben die vorliegenden Parameter geprüft. Während die technische Spezifikation unseren Anforderungen entspricht, ist die aktuelle Zahlungsziel-Regelung für uns in dieser Form nicht abbildbar. Wir schlagen vor, den Fokus auf die Revisionsklausel zu legen, um die Partnerschaft agil zu halten…"
            </p>
          </div>

          {/* Refinement chat */}
          <div className="bg-card border border-border/30 rounded-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-tertiary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
              </span>
              <p className="font-mono-label text-tertiary">Refinement Chat</p>
            </div>
            <div className="bg-muted/40 rounded-sm p-4 mb-4">
              <p className="font-serif italic text-sm text-foreground/80 leading-relaxed">
                Möchten Sie den Tonfall etwas 'aggressiver' gestalten oder den Fokus stärker auf die technologische Überlegenheit legen?
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {["Aggressiver", "Kürzer Fassen", "Mehr Empathie"].map((tag) => (
                <button key={tag} className="px-3 py-1.5 border border-border/40 rounded-sm font-mono-label text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                  {tag}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                placeholder="Anweisung zur Anpassung eingeben…"
                className="w-full bg-transparent border-b border-border/40 focus:border-primary/40 focus:outline-none py-3 pr-10 font-serif italic text-sm placeholder:text-muted-foreground/60"
              />
              <button className="absolute right-0 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
