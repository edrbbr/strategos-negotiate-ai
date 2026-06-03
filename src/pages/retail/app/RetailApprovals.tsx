import { useState } from "react";
import { Link } from "react-router-dom";
import { useApprovals, useDecideApproval } from "@/hooks/useBusinessCases";
import { useBusinessMembership, roleRank } from "@/hooks/useBusinessAccount";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Edit3 } from "lucide-react";

function eur(n: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }

export default function RetailApprovals() {
  const { data: m } = useBusinessMembership();
  const { data: list } = useApprovals(m?.business_account_id);
  const decide = useDecideApproval();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Record<string, { amount: string; percent: string; notes: string }>>({});

  async function act(id: string, decision: "accepted"|"modified"|"rejected", appr: any) {
    try {
      const e = editing[id];
      const payload: any = { approval_id: id, decision, notes: e?.notes };
      if (decision === "modified" && e) { payload.final_amount = Number(e.amount); payload.final_percent = Number(e.percent); }
      else if (decision === "accepted") { payload.final_amount = appr.requested_amount; payload.final_percent = appr.requested_percent; }
      await decide.mutateAsync(payload);
      toast({ title: "Entscheidung gespeichert" });
    } catch (err: any) { toast({ title: "Fehler", description: err.message, variant: "destructive" }); }
  }

  const pending = (list ?? []).filter((a: any) => a.status === "pending");
  const decided = (list ?? []).filter((a: any) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Eskalationen</h1>
        <p className="text-sm text-muted-foreground">Fälle, die Ihre Freigabe benötigen.</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Wartend ({pending.length})</h2>
        {pending.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">Keine offenen Eskalationen.</CardContent></Card>}
        <div className="space-y-3">
          {pending.map((a: any) => {
            const canDecide = m && roleRank[m.role] >= roleRank[a.required_role as keyof typeof roleRank];
            const e = editing[a.id] ?? { amount: String(a.requested_amount), percent: String(a.requested_percent), notes: "" };
            return (
              <Card key={a.id} className="border-amber-500/30">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <Link to={`/retail/app/cases/${a.case_id}`} className="text-sm font-mono hover:underline">{a.case?.case_number}</Link>
                      <div className="font-semibold">{a.case?.product_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-1">von {a.requested_by_role} · benötigt {a.required_role}</div>
                    </div>
                    <Badge variant="destructive">Wartend</Badge>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2 text-sm">
                    <div><div className="text-xs text-muted-foreground">Kaufpreis</div>{eur(a.case?.purchase_price_total ?? 0)}</div>
                    <div><div className="text-xs text-muted-foreground">Forderung</div>{eur(a.case?.claimed_amount ?? 0)}</div>
                    <div><div className="text-xs text-muted-foreground">Vorschlag</div><strong>{eur(a.requested_amount)} ({a.requested_percent}%)</strong></div>
                  </div>
                  {a.justification && <div className="text-sm bg-muted/30 p-3 rounded">{a.justification}</div>}
                  {canDecide ? (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid md:grid-cols-2 gap-2">
                        <Input type="number" step="0.01" placeholder="Betrag €" value={e.amount} onChange={(ev) => setEditing({ ...editing, [a.id]: { ...e, amount: ev.target.value } })} />
                        <Input type="number" step="0.01" placeholder="Prozent %" value={e.percent} onChange={(ev) => setEditing({ ...editing, [a.id]: { ...e, percent: ev.target.value } })} />
                      </div>
                      <Textarea rows={2} placeholder="Notiz / Begründung" value={e.notes} onChange={(ev) => setEditing({ ...editing, [a.id]: { ...e, notes: ev.target.value } })} />
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => act(a.id, "accepted", a)} disabled={decide.isPending}><CheckCircle2 className="w-4 h-4 mr-1" />Vorschlag annehmen</Button>
                        <Button size="sm" variant="secondary" onClick={() => act(a.id, "modified", a)} disabled={decide.isPending}><Edit3 className="w-4 h-4 mr-1" />Mit Anpassung freigeben</Button>
                        <Button size="sm" variant="destructive" onClick={() => act(a.id, "rejected", a)} disabled={decide.isPending}><XCircle className="w-4 h-4 mr-1" />Ablehnen</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Ihre Rolle reicht nicht zum Entscheiden.</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Entschieden</h2>
          <div className="space-y-2">
            {decided.map((a: any) => (
              <Card key={a.id}><CardContent className="p-4 flex items-center justify-between flex-wrap gap-2 text-sm">
                <div>
                  <Link to={`/retail/app/cases/${a.case_id}`} className="font-mono text-xs hover:underline">{a.case?.case_number}</Link>
                  <div className="font-medium">{a.case?.product_name ?? "—"}</div>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{a.status}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{a.final_amount != null ? eur(a.final_amount) : "—"}</div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}