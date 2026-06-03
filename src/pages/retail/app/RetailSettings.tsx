import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessMembership, useBusinessSettings, roleRank } from "@/hooks/useBusinessAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function RetailSettings() {
  const { data: m } = useBusinessMembership();
  const { data: s } = useBusinessSettings(m?.business_account_id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const canEdit = m && roleRank[m.role] >= 2;
  const [f, setF] = useState({ sb: "10", mg: "25", lt: "100", kulanz: "", currency: "EUR", vat: "19" });

  useEffect(() => {
    if (s) {
      const l = s.max_discount_limits ?? {};
      setF({
        sb: String(l.sachbearbeiter_max_percent ?? 10),
        mg: String(l.manager_max_percent ?? 25),
        lt: String(l.leitung_max_percent ?? 100),
        kulanz: s.kulanz_rules ?? "",
        currency: s.currency ?? "EUR",
        vat: String(s.default_vat_rate ?? 19),
      });
    }
  }, [s]);

  async function save() {
    const patch = {
      max_discount_limits: { sachbearbeiter_max_percent: Number(f.sb), manager_max_percent: Number(f.mg), leitung_max_percent: Number(f.lt) },
      kulanz_rules: f.kulanz, currency: f.currency, default_vat_rate: Number(f.vat),
    };
    const { error } = await (supabase as any).from("business_settings").update(patch).eq("business_account_id", m!.business_account_id);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else { toast({ title: "Gespeichert" }); qc.invalidateQueries({ queryKey: ["business-settings"] }); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <Card><CardHeader><CardTitle>Rabatt-Limits (in % vom Kaufpreis)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Sachbearbeiter</Label><Input type="number" disabled={!canEdit} value={f.sb} onChange={(e) => setF({ ...f, sb: e.target.value })} /></div>
            <div><Label>Manager</Label><Input type="number" disabled={!canEdit} value={f.mg} onChange={(e) => setF({ ...f, mg: e.target.value })} /></div>
            <div><Label>Leitung</Label><Input type="number" disabled={!canEdit} value={f.lt} onChange={(e) => setF({ ...f, lt: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Kulanzregeln</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={8} disabled={!canEdit} value={f.kulanz} onChange={(e) => setF({ ...f, kulanz: e.target.value })} placeholder="Beispiel: Bei Stammkunden bis 5% Rabatt automatisch. Versandbeschädigung: Ersatz oder 100% Erstattung..." />
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Allgemein</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div><Label>Währung</Label><Input disabled={!canEdit} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
          <div><Label>MwSt. (%)</Label><Input type="number" disabled={!canEdit} value={f.vat} onChange={(e) => setF({ ...f, vat: e.target.value })} /></div>
        </CardContent>
      </Card>
      {canEdit && <Button onClick={save}>Speichern</Button>}
    </div>
  );
}