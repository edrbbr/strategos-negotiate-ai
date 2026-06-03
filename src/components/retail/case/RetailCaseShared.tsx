import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowUpCircle, CheckCircle2 } from "lucide-react";
import type { BusinessCase } from "@/hooks/useBusinessCases";

export function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

export interface OptionCardProps {
  opt: any;
  index: number;
  isRecommended?: boolean;
  caseStatus: BusinessCase["status"];
  onApply: (opt: any) => void;
  onRefineThis?: (opt: any) => void;
  applying?: boolean;
  compact?: boolean;
}

export function OptionCard({ opt, index, isRecommended, caseStatus, onApply, onRefineThis, applying, compact }: OptionCardProps) {
  const pct = Number(opt.percent_of_purchase) || 0;
  const required = String(opt.required_role || "sachbearbeiter");
  const escalated = required !== "sachbearbeiter";
  const closed = caseStatus === "closed" || caseStatus === "rejected";
  return (
    <Card className={isRecommended ? "border-primary/60 shadow-sm" : ""}>
      <CardContent className={compact ? "p-4 space-y-2" : "p-5 space-y-3"}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Option {index + 1}{isRecommended && " · Empfohlen"}</div>
            <div className="font-semibold">{opt.label}</div>
            <div className="text-2xl font-bold mt-1">{eur(opt.amount_eur)} <span className="text-sm font-normal text-muted-foreground">({pct}%)</span></div>
          </div>
          <Badge variant={escalated ? "secondary" : "outline"}>
            {escalated ? <><ArrowUpCircle className="w-3 h-3 mr-1" />{required}</> : "direkt"}
          </Badge>
        </div>
        <div className="text-sm"><span className="font-medium">Begründung:</span> {opt.rationale}</div>
        <div className="text-sm p-3 bg-muted/40 rounded border-l-2 border-primary/40">
          <span className="font-medium text-xs uppercase text-muted-foreground block mb-1">Wortlaut für Kunde</span>
          {opt.customer_wording}
        </div>
        {!closed && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => onApply(opt)} disabled={applying}>
              <CheckCircle2 className="w-4 h-4 mr-1" />Diese Option freigeben
            </Button>
            {onRefineThis && (
              <Button size="sm" variant="ghost" onClick={() => onRefineThis(opt)}>
                Diese verfeinern
              </Button>
            )}
            {escalated && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />Eskalation an {required} wird mit erzeugt
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}