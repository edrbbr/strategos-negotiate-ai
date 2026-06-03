import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessMembership } from "@/hooks/useBusinessAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function eur(n: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }

export default function RetailBilling() {
  const { data: m } = useBusinessMembership();
  const accountId = m?.business_account_id;

  const { data: billing } = useQuery({
    queryKey: ["business-billing", accountId], enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_billing").select("*").eq("business_account_id", accountId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: invoices } = useQuery({
    queryKey: ["business-invoices", accountId], enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_invoices").select("*").eq("business_account_id", accountId!).order("period_end", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Abrechnung</h1>
      <Card><CardHeader><CardTitle>Vertrag</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
          <div><div className="text-xs text-muted-foreground uppercase">Modell</div>{billing?.billing_model ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground uppercase">Monatsgebühr</div>{eur((billing?.monthly_fee_cents ?? 0) / 100)}</div>
          <div><div className="text-xs text-muted-foreground uppercase">Nächste Rechnung</div>{billing?.next_invoice_date ?? "—"}</div>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Rechnungen</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(invoices ?? []).map((i: any) => (
              <div key={i.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{i.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">{i.period_start} – {i.period_end}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{eur(i.amount_cents / 100)}</div>
                  <Badge variant="outline">{i.status}</Badge>
                </div>
              </div>
            ))}
            {(invoices ?? []).length === 0 && <div className="p-6 text-sm text-muted-foreground">Keine Rechnungen.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}