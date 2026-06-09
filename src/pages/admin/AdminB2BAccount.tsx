import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { IndustryPicker } from "@/components/admin/IndustryPicker";
import { RoleHierarchyEditor } from "@/components/retail/settings/RoleHierarchyEditor";

function eur(n: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }

export default function AdminB2BAccount() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: acc } = useQuery({ queryKey: ["admin-b2b-acc", id], enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_accounts").select("*").eq("id", id!).single();
      if (error) throw error; return data;
    }});
  const { data: users } = useQuery({ queryKey: ["admin-b2b-users", id], enabled: !!id,
    queryFn: async () => (await (supabase as any).from("business_users").select("*").eq("business_account_id", id!)).data ?? [] });
  const { data: kpis } = useQuery({ queryKey: ["admin-b2b-kpis", id], enabled: !!id,
    queryFn: async () => (await (supabase as any).from("business_case_kpis").select("*").eq("business_account_id", id!).maybeSingle()).data });
  const { data: billing } = useQuery({ queryKey: ["admin-b2b-billing", id], enabled: !!id,
    queryFn: async () => (await (supabase as any).from("business_billing").select("*").eq("business_account_id", id!).maybeSingle()).data });

  async function setStatus(status: string) {
    const { error } = await (supabase as any).from("business_accounts").update({ status }).eq("id", id!);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else { toast({ title: "Status geändert" }); qc.invalidateQueries({ queryKey: ["admin-b2b-acc", id] }); }
  }
  async function setIndustry(key: string) {
    const { error } = await (supabase as any).from("business_accounts").update({ industry: key }).eq("id", id!);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else { toast({ title: "Branche aktualisiert" }); qc.invalidateQueries({ queryKey: ["admin-b2b-acc", id] }); }
  }
  async function updateBilling(patch: any) {
    const { error } = await (supabase as any).from("business_billing").update(patch).eq("business_account_id", id!);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["admin-b2b-billing", id] });
  }

  if (!acc) return <div className="p-6">Lade…</div>;
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/admin/b2b" className="text-xs text-muted-foreground hover:underline">← Zurück</Link>
            <h1 className="text-2xl font-semibold">{acc.name}</h1>
            <div className="text-sm text-muted-foreground">{acc.industry ?? "—"} · {acc.billing_email}</div>
          </div>
          <div className="flex gap-2">
            <Badge variant={acc.status === "active" ? "default" : "outline"}>{acc.status}</Badge>
            {acc.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => setStatus("suspended")}>Sperren</Button>}
            {acc.status !== "active" && <Button size="sm" onClick={() => setStatus("active")}>Aktivieren</Button>}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          {[
            { l: "Fälle gesamt", v: kpis?.total_cases ?? 0 },
            { l: "Wartend", v: kpis?.waiting_approval_cases ?? 0 },
            { l: "Forderungen", v: eur(Number(kpis?.sum_claimed ?? 0)) },
            { l: "Gespart", v: eur(Number(kpis?.sum_saved ?? 0)) },
          ].map((s) => (
            <Card key={s.l}><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{s.l}</div><div className="text-xl font-bold mt-1">{s.v}</div></CardContent></Card>
          ))}
        </div>

        <Card><CardHeader><CardTitle>Nutzer ({users?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(users ?? []).map((u: any) => (
                <div key={u.id} className="p-3 flex items-center justify-between">
                  <div><div className="font-medium text-sm">{u.full_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
                  <Badge>{u.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Abrechnung</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid md:grid-cols-3 gap-3">
              <div><div className="text-xs text-muted-foreground uppercase">Modell</div>{billing?.billing_model ?? "—"}</div>
              <div><div className="text-xs text-muted-foreground uppercase">Monatsgebühr</div>{eur((billing?.monthly_fee_cents ?? 0) / 100)}</div>
              <div><div className="text-xs text-muted-foreground uppercase">Status</div>{billing?.payment_status ?? "—"}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => {
                const v = prompt("Neue Monatsgebühr in Cent:", String(billing?.monthly_fee_cents ?? 0));
                if (v != null) updateBilling({ monthly_fee_cents: Number(v) });
              }}>Gebühr ändern</Button>
              <Button size="sm" variant="outline" onClick={() => updateBilling({ payment_status: "paid" })}>Als bezahlt markieren</Button>
            </div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Branche</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <IndustryPicker value={acc.industry ?? ""} onChange={setIndustry} />
            <p className="text-xs text-muted-foreground">Die Branche steuert den branchenspezifischen Kontext der KI (Rechtsrahmen, typische Fälle).</p>
          </CardContent>
        </Card>

        <RoleHierarchyEditor accountId={id!} canEdit={true} />
      </div>
    </div>
  );
}