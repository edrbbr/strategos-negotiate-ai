import { useParams } from "react-router-dom";
import { useState } from "react";
import { useBusinessCase, useBusinessCaseRealtime, useRunPipeline, useDecideCase } from "@/hooks/useBusinessCases";
import { useBusinessMembership, useBusinessSettings, roleRank, roleLabel } from "@/hooks/useBusinessAccount";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, AlertTriangle, CheckCircle2, ArrowUpCircle } from "lucide-react";

function eur(n: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }

export default function RetailCaseDetail() {
  const { id } = useParams();
  const { data: c, isLoading } = useBusinessCase(id);
  useBusinessCaseRealtime(id);
  const { data: m } = useBusinessMembership();
  const { data: settings } = useBusinessSettings(m?.business_account_id);
  const runPipe = useRunPipeline();
  const decide = useDecideCase();
  const { toast } = useToast();
  const [decisionNotes, setDecisionNotes] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (isLoading) return <div className="text-muted-foreground">Lade…</div>;
  if (!c) return <div>Fall nicht gefunden.</div>;

  const options: any[] = Array.isArray(c.ai_options) ? c.ai_options : [];
  const limits = (settings?.max_discount_limits ?? {}) as any;
  const myMaxPct = m ? (m.role === "leitung" ? (limits.leitung_max_percent ?? 100)
    : m.role === "manager" ? (limits.manager_max_percent ?? 25)
    : (limits.sachbearbeiter_max_percent ?? 10)) : 0;

  async function applyOption(opt: any) {
    try {
      await decide.mutateAsync({
        case_id: c!.id, final_amount: Number(opt.amount_eur) || 0,
        final_percent: Number(opt.percent_of_purchase) || 0, notes: decisionNotes,
      });
      toast({ title: "Entscheidung gespeichert" });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono">{c.case_number}</div>
          <h1 className="text-2xl font-semibold">{c.product_name || c.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{c.status.replace("_"," ")}</Badge>
            {c.required_approval_role && <Badge variant="outline">Erfordert: {c.required_approval_role}</Badge>}
          </div>
        </div>
        {options.length === 0 && (
          <Button onClick={() => runPipe.mutate(c.id)} disabled={runPipe.isPending}>
            <Sparkles className="w-4 h-4 mr-2" />{runPipe.isPending ? "Analysiere…" : "AI-Analyse starten"}
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Kaufpreis</div><div className="text-xl font-bold">{eur(c.purchase_price_total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Kundenforderung</div><div className="text-xl font-bold">{eur(c.claimed_amount)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Gewährt</div><div className="text-xl font-bold">{c.final_granted_amount != null ? eur(c.final_granted_amount) : "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Beschreibung</CardTitle></CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">{c.situation_text || "—"}</CardContent>
      </Card>

      {c.ai_analysis && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />AI-Analyse</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><div className="font-medium text-xs uppercase text-muted-foreground mb-1">Analyse</div>{(c.ai_analysis as any).analysis}</div>
            {(c.ai_analysis as any).risk_assessment && <div><div className="font-medium text-xs uppercase text-muted-foreground mb-1">Risiken</div>{(c.ai_analysis as any).risk_assessment}</div>}
          </CardContent>
        </Card>
      )}

      {options.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Vorschläge</h2>
          {options.map((opt, i) => {
            const pct = Number(opt.percent_of_purchase) || 0;
            const exceedsLimit = pct > myMaxPct;
            return (
              <Card key={i} className={selectedIdx === i ? "border-primary" : ""}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-2xl font-bold mt-1">{eur(opt.amount_eur)} <span className="text-sm font-normal text-muted-foreground">({pct}%)</span></div>
                    </div>
                    <div className="text-right">
                      <Badge variant={exceedsLimit ? "destructive" : "outline"}>
                        {exceedsLimit ? <><ArrowUpCircle className="w-3 h-3 mr-1" />Eskalation: {opt.required_role}</> : "Direkt freigebbar"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm"><span className="font-medium">Begründung:</span> {opt.rationale}</div>
                  <div className="text-sm p-3 bg-muted/40 rounded border-l-2 border-primary/40"><span className="font-medium text-xs uppercase text-muted-foreground block mb-1">Wortlaut für Kunde</span>{opt.customer_wording}</div>
                  {c.status !== "closed" && c.status !== "rejected" && (
                    <div className="flex gap-2">
                      {!exceedsLimit ? (
                        <Button size="sm" onClick={() => { setSelectedIdx(i); applyOption(opt); }} disabled={decide.isPending}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />Diese Option freigeben
                        </Button>
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Diese Option überschreitet Ihr Limit ({myMaxPct}%). Eskalation wurde automatisch erzeugt — Manager/Leitung entscheidet unter „Eskalationen".</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {c.status !== "closed" && c.status !== "rejected" && (
            <Card><CardContent className="p-4">
              <div className="text-sm font-medium mb-2">Notiz zur Entscheidung (optional)</div>
              <Textarea rows={2} value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
            </CardContent></Card>
          )}
        </div>
      )}

      {m && <div className="text-xs text-muted-foreground">Sie sind angemeldet als {roleLabel[m.role]} · Ihr Rabatt-Limit: {myMaxPct}%</div>}
    </div>
  );
}