import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, AlertTriangle } from "lucide-react";
import type { BusinessCase } from "@/hooks/useBusinessCases";
import { useBusinessCaseVersions } from "@/hooks/useBusinessCases";
import { OptionCard, eur } from "./RetailCaseShared";
import { RefinementChat } from "./RefinementChat";

export function ViewOptions({ caseRow, onApply }: { caseRow: BusinessCase; onApply: (opt: any) => void }) {
  const { data: versions = [] } = useBusinessCaseVersions(caseRow.id);
  const current = versions[versions.length - 1];
  const analysis = (current?.ai_analysis ?? caseRow.ai_analysis) as any;
  const options = (current?.ai_options ?? caseRow.ai_options ?? []) as any[];
  const rec = current?.recommended_index ?? 0;

  return (
    <div className="space-y-6">
      {/* Compact KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Kaufpreis" value={eur(caseRow.purchase_price_total)} />
        <KPI label="Kundenforderung" value={eur(caseRow.claimed_amount)} />
        <KPI label="Empfohlen" value={options[rec] ? `${eur(options[rec].amount_eur)} (${options[rec].percent_of_purchase}%)` : "—"} accent />
        <KPI label="Status" value={caseRow.status.replace("_", " ")} />
      </div>

      {/* Analysis & risks side-by-side */}
      {analysis && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">KI-Analyse</h3></div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{analysis.analysis || "—"}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" /><h3 className="font-semibold text-sm">Risiken</h3></div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{analysis.risk_assessment || "—"}</p>
          </CardContent></Card>
        </div>
      )}

      {/* 3 options side-by-side */}
      {options.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Vorschläge (konservativ · mittel · kulant)</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {options.map((opt, i) => (
              <OptionCard key={i} opt={opt} index={i} isRecommended={i === rec}
                caseStatus={caseRow.status} onApply={onApply} />
            ))}
          </div>
        </div>
      )}

      {/* Refinement chat */}
      <div className="border-t border-border/30 pt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Refinement</h2>
        <RefinementChat caseRow={caseRow} style="timeline" onApplyOption={onApply} />
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/50 bg-primary/5" : ""}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}