import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Diamond } from "lucide-react";
import type { BusinessCase } from "@/hooks/useBusinessCases";
import { useBusinessCaseVersions } from "@/hooks/useBusinessCases";
import { OptionCard, eur } from "./RetailCaseShared";
import { RefinementChat } from "./RefinementChat";

export function ViewStrategos({ caseRow, onApply }: { caseRow: BusinessCase; onApply: (opt: any) => void }) {
  const { data: versions = [] } = useBusinessCaseVersions(caseRow.id);
  const current = versions[versions.length - 1];
  const analysis = (current?.ai_analysis ?? caseRow.ai_analysis) as any;
  const options = (current?.ai_options ?? caseRow.ai_options ?? []) as any[];
  const rec = current?.recommended_index ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-2">
        <div className="h-1 bg-secondary" />
        <div className="h-1 bg-primary" />
        <div className="h-1 bg-accent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: situation + meta */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wide font-mono text-primary mb-2">◆ Situation</p>
            <div className="bg-card border border-border/40 rounded-sm p-5 text-[15px] leading-7 whitespace-pre-wrap">
              {caseRow.situation_text || "—"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetaTile label="Kaufpreis" value={eur(caseRow.purchase_price_total)} />
            <MetaTile label="Forderung" value={eur(caseRow.claimed_amount)} />
            <MetaTile label="Gewährt" value={caseRow.final_granted_amount != null ? eur(caseRow.final_granted_amount) : "—"} />
          </div>
        </div>

        {/* Right: 3 stage boxes */}
        <div className="space-y-4">
          <StageBox color="secondary" label="Analyse-Modul">
            {analysis?.analysis ? (
              <ul className="space-y-3 text-sm">
                {String(analysis.analysis).split(/\n+/).filter(Boolean).map((line: string, i: number) => (
                  <li key={i} className="flex gap-3"><Diamond className="w-3 h-3 text-secondary mt-1.5 shrink-0" fill="currentColor" /><span>{line}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Wartet auf Pipeline.</p>}
          </StageBox>

          <StageBox color="primary" label="Strategie / Risiken">
            {analysis?.risk_assessment ? (
              <p className="text-sm leading-relaxed whitespace-pre-line">{analysis.risk_assessment}</p>
            ) : <p className="text-sm text-muted-foreground">Wartet…</p>}
          </StageBox>

          <StageBox color="accent" label="Optionen (Draft)">
            {options.length > 0 ? (
              <div className="space-y-3">
                {options.map((opt, i) => (
                  <OptionCard key={i} opt={opt} index={i} isRecommended={i === rec}
                    caseStatus={caseRow.status} onApply={onApply} compact />
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Noch keine Optionen.</p>}
          </StageBox>
        </div>
      </div>

      {/* Refinement chat */}
      <div className="border-t border-border/30 pt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Refinement-Chat</h2>
        <RefinementChat caseRow={caseRow} style="timeline" onApplyOption={onApply} />
      </div>
    </div>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </CardContent></Card>
  );
}

function StageBox({ color, label, children }: { color: "secondary" | "primary" | "accent"; label: string; children: React.ReactNode }) {
  const tone = color === "secondary" ? "border-secondary text-secondary"
    : color === "primary" ? "border-primary text-primary"
    : "border-accent text-accent-foreground";
  return (
    <div className={`border-l-2 ${tone.split(" ")[0]} bg-card rounded-sm p-4`}>
      <p className={`text-[10px] uppercase tracking-wide font-mono mb-3 ${tone.split(" ")[1] ?? ""}`}>● {label}</p>
      {children}
    </div>
  );
}