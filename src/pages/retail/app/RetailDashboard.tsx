import { useBusinessMembership } from "@/hooks/useBusinessAccount";
import { useBusinessKpis, useBusinessCases } from "@/hooks/useBusinessCases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, TrendingDown, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

function eur(n: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }

export default function RetailDashboard() {
  const { data: m } = useBusinessMembership();
  const { data: k } = useBusinessKpis(m?.business_account_id);
  const { data: cases } = useBusinessCases(m?.business_account_id);
  const recent = (cases ?? []).slice(0, 6);

  const stats = [
    { label: "Fälle gesamt", value: k?.total_cases ?? 0, icon: FileText },
    { label: "Offen", value: k?.open_cases ?? 0, icon: AlertCircle },
    { label: "Eskalationen wartend", value: k?.waiting_approval_cases ?? 0, icon: AlertCircle },
    { label: "Abgeschlossen", value: k?.closed_cases ?? 0, icon: CheckCircle2 },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{m?.business_account?.name}</p>
        </div>
        <Link to="/retail/app/cases/new"><Button><Plus className="w-4 h-4 mr-2" />Neuer Fall</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Summe Kaufpreise</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold">{eur(Number(k?.sum_purchase ?? 0))}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Summe Forderungen</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold">{eur(Number(k?.sum_claimed ?? 0))}</div></CardContent></Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-primary" />Gesparte Marge</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold text-primary">{eur(Number(k?.sum_saved ?? 0))}</div>
          <div className="text-xs text-muted-foreground mt-1">Ø {Number(k?.avg_granted_percent ?? 0).toFixed(1)}% gewährt</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Letzte Fälle</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Fälle erfasst. <Link to="/retail/app/cases/new" className="text-primary hover:underline">Ersten Fall anlegen</Link></p>
          ) : (
            <div className="divide-y">
              {recent.map((c) => (
                <Link key={c.id} to={`/retail/app/cases/${c.id}`} className="flex items-center justify-between py-3 hover:bg-accent/30 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.case_number} · {c.product_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("de-DE")}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{eur(c.claimed_amount)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{c.status.replace("_"," ")}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}