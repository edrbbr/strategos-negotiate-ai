import { useParams } from "react-router-dom";
import { useBusinessCase, useBusinessCaseRealtime, useRunPipeline, useReopenCase } from "@/hooks/useBusinessCases";
import { useBusinessMembership, roleLabel } from "@/hooks/useBusinessAccount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RotateCcw } from "lucide-react";
import { ViewChat } from "@/components/retail/case/ViewChat";
import { statusLabel, statusVariant } from "@/lib/businessCaseStatus";

export default function RetailCaseDetail() {
  const { id } = useParams();
  const { data: c, isLoading } = useBusinessCase(id);
  useBusinessCaseRealtime(id);
  const { data: m } = useBusinessMembership();
  const runPipe = useRunPipeline();
  const reopen = useReopenCase();
  const { toast } = useToast();

  if (isLoading) return <div className="text-muted-foreground">Lade…</div>;
  if (!c) return <div>Fall nicht gefunden.</div>;

  const options: any[] = Array.isArray(c.ai_options) ? c.ai_options : [];
  const isClosed = c.status === "closed" || c.status === "rejected";
  const canReopen = m && (m.role === "manager" || m.role === "leitung");

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono">{c.case_number}</div>
          <h1 className="text-2xl font-semibold">{c.product_name || c.title}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
            {c.required_approval_role && !isClosed && <Badge variant="outline">Erfordert: {c.required_approval_role}</Badge>}
            {m && <span className="text-xs text-muted-foreground">Sie: {roleLabel[m.role]}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {options.length === 0 && !isClosed && (
            <Button onClick={() => runPipe.mutate(c.id)} disabled={runPipe.isPending}>
              <Sparkles className="w-4 h-4 mr-2" />
              {runPipe.isPending ? "Analysiere…" : "AI-Analyse starten"}
            </Button>
          )}
          {isClosed && canReopen && (
            <Button variant="outline" disabled={reopen.isPending} onClick={async () => {
              try { await reopen.mutateAsync({ case_id: c.id }); toast({ title: "Fall wieder geöffnet" }); }
              catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
            }}>
              <RotateCcw className="w-4 h-4 mr-2" />Fall wieder öffnen
            </Button>
          )}
        </div>
      </div>

      <ViewChat caseRow={c} />
    </div>
  );
}