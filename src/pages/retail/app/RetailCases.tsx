import { Link } from "react-router-dom";
import { useState } from "react";
import { useBusinessMembership } from "@/hooks/useBusinessAccount";
import { useBusinessCases, useReopenCase, type BusinessCase } from "@/hooks/useBusinessCases";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, RotateCcw } from "lucide-react";
import { statusLabel, statusVariant } from "@/lib/businessCaseStatus";
import { formatEuro } from "@/lib/euro";
import { CloseCaseModal } from "@/components/retail/case/CloseCaseModal";
import { useToast } from "@/hooks/use-toast";

export default function RetailCases() {
  const { data: m } = useBusinessMembership();
  const { data: cases, isLoading } = useBusinessCases(m?.business_account_id);
  const reopen = useReopenCase();
  const { toast } = useToast();
  const [closeCase, setCloseCase] = useState<BusinessCase | null>(null);
  const canReopen = m && (m.role === "manager" || m.role === "leitung");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fälle</h1>
        <Link to="/retail/app/cases/new"><Button><Plus className="w-4 h-4 mr-2" />Neuer Fall</Button></Link>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Nummer</th><th className="p-3">Produkt</th><th className="p-3">Kaufpreis</th>
                <th className="p-3">Forderung</th><th className="p-3">Gewährt</th><th className="p-3">Status</th><th className="p-3">Erfasst</th><th className="p-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={8}>Lade...</td></tr>}
              {!isLoading && (cases ?? []).length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={8}>Noch keine Fälle.</td></tr>}
              {(cases ?? []).map((c) => {
                const closed = c.status === "closed" || c.status === "rejected";
                return (
                  <tr key={c.id} className="hover:bg-accent/30">
                    <td className="p-3"><Link to={`/retail/app/cases/${c.id}`} className="font-mono text-xs hover:underline">{c.case_number}</Link></td>
                    <td className="p-3"><Link to={`/retail/app/cases/${c.id}`} className="hover:underline">{c.product_name ?? "—"}</Link></td>
                    <td className="p-3">{formatEuro(c.purchase_price_total)}</td>
                    <td className="p-3">{formatEuro(c.claimed_amount)}</td>
                    <td className="p-3">{c.final_granted_amount != null ? formatEuro(c.final_granted_amount) : "—"}</td>
                    <td className="p-3"><Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("de-DE")}</td>
                    <td className="p-3 text-right">
                      {!closed && (
                        <Button size="sm" variant="outline" onClick={() => setCloseCase(c)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Abschließen
                        </Button>
                      )}
                      {closed && canReopen && (
                        <Button size="sm" variant="ghost" disabled={reopen.isPending}
                          onClick={async () => {
                            try { await reopen.mutateAsync({ case_id: c.id }); toast({ title: "Fall wieder geöffnet" }); }
                            catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
                          }}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />Wieder öffnen
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {closeCase && (
        <CloseCaseModal open={!!closeCase} onOpenChange={(o) => !o && setCloseCase(null)} caseRow={closeCase} />
      )}
    </div>
  );
}