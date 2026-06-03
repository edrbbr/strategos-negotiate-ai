import { Link } from "react-router-dom";
import { useBusinessMembership } from "@/hooks/useBusinessAccount";
import { useBusinessCases } from "@/hooks/useBusinessCases";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

function eur(n: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }
const statusColor: Record<string, string> = {
  open: "secondary", in_review: "default", waiting_approval: "destructive", closed: "outline", rejected: "outline",
};

export default function RetailCases() {
  const { data: m } = useBusinessMembership();
  const { data: cases, isLoading } = useBusinessCases(m?.business_account_id);
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
                <th className="p-3">Forderung</th><th className="p-3">Gewährt</th><th className="p-3">Status</th><th className="p-3">Erfasst</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={7}>Lade...</td></tr>}
              {!isLoading && (cases ?? []).length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={7}>Noch keine Fälle.</td></tr>}
              {(cases ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-accent/30 cursor-pointer">
                  <td className="p-3"><Link to={`/retail/app/cases/${c.id}`} className="font-mono text-xs hover:underline">{c.case_number}</Link></td>
                  <td className="p-3">{c.product_name ?? "—"}</td>
                  <td className="p-3">{eur(c.purchase_price_total)}</td>
                  <td className="p-3">{eur(c.claimed_amount)}</td>
                  <td className="p-3">{c.final_granted_amount != null ? eur(c.final_granted_amount) : "—"}</td>
                  <td className="p-3"><Badge variant={statusColor[c.status] as any}>{c.status.replace("_"," ")}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("de-DE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}