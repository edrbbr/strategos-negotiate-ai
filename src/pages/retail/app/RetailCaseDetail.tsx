import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useBusinessCase, useBusinessCaseRealtime, useRunPipeline, useDecideCase } from "@/hooks/useBusinessCases";
import { useBusinessMembership, roleLabel } from "@/hooks/useBusinessAccount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import { ViewStrategos } from "@/components/retail/case/ViewStrategos";
import { ViewOptions } from "@/components/retail/case/ViewOptions";
import { ViewChat } from "@/components/retail/case/ViewChat";

type Variant = "A" | "B" | "C";
const STORAGE_KEY = "retail.case.variant";

export default function RetailCaseDetail() {
  const { id } = useParams();
  const { data: c, isLoading } = useBusinessCase(id);
  useBusinessCaseRealtime(id);
  const { data: m } = useBusinessMembership();
  const runPipe = useRunPipeline();
  const decide = useDecideCase();
  const { toast } = useToast();

  const [variant, setVariant] = useState<Variant>(() => {
    return "C";
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, variant); }, [variant]);

  if (isLoading) return <div className="text-muted-foreground">Lade…</div>;
  if (!c) return <div>Fall nicht gefunden.</div>;

  async function applyOption(opt: any) {
    try {
      await decide.mutateAsync({
        case_id: c!.id,
        final_amount: Number(opt.amount_eur) || 0,
        final_percent: Number(opt.percent_of_purchase) || 0,
      });
      toast({ title: "Entscheidung gespeichert", description: opt.label });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  }

  const options: any[] = Array.isArray(c.ai_options) ? c.ai_options : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono">{c.case_number}</div>
          <h1 className="text-2xl font-semibold">{c.product_name || c.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge>{c.status.replace("_", " ")}</Badge>
            {c.required_approval_role && <Badge variant="outline">Erfordert: {c.required_approval_role}</Badge>}
            {m && <span className="text-xs text-muted-foreground">Sie: {roleLabel[m.role]}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {options.length === 0 && (
            <Button onClick={() => runPipe.mutate(c.id)} disabled={runPipe.isPending}>
              <Sparkles className="w-4 h-4 mr-2" />
              {runPipe.isPending ? "Analysiere…" : "AI-Analyse starten"}
            </Button>
          )}
        </div>
      </div>

      {/* Selected view */}
      {variant === "A" && <ViewStrategos caseRow={c} onApply={applyOption} />}
      {variant === "B" && <ViewOptions caseRow={c} onApply={applyOption} />}
      {variant === "C" && <ViewChat caseRow={c} onApply={applyOption} />}
    </div>
  );
}