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
import { RoleHierarchyEditor } from "@/components/retail/settings/RoleHierarchyEditor";
import { RoleAdminsSection } from "@/components/retail/settings/RoleAdminsSection";
import { useCanManageRoles } from "@/hooks/useRoleHierarchy";

export default function RetailSettings() {
  const { data: m } = useBusinessMembership();
  const { data: s } = useBusinessSettings(m?.business_account_id);
  const { data: canManageRoles } = useCanManageRoles(m?.business_account_id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const canEdit = m && roleRank[m.role] >= 2;
  const [f, setF] = useState({ kulanz: "", currency: "EUR", vat: "19" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s) {
      setF({
        kulanz: s.kulanz_rules ?? "",
        currency: s.currency ?? "EUR",
        vat: String(s.default_vat_rate ?? 19),
      });
    }
  }, [s]);

  async function save() {
    setSaving(true);
    const patch = {
      business_account_id: m!.business_account_id,
      kulanz_rules: f.kulanz, currency: f.currency, default_vat_rate: Number(f.vat),
    };
    const { error } = await (supabase as any)
      .from("business_settings")
      .upsert(patch, { onConflict: "business_account_id" });
    setSaving(false);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else { toast({ title: "Gespeichert" }); qc.invalidateQueries({ queryKey: ["business-settings"] }); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      {m?.business_account_id && (
        <RoleHierarchyEditor accountId={m.business_account_id} canEdit={!!canManageRoles} />
      )}
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
      {canEdit && <Button onClick={save} disabled={saving}>{saving ? "Speichere…" : "Speichern"}</Button>}
      {m?.business_account_id && m.role === "leitung" && (
        <RoleAdminsSection accountId={m.business_account_id} />
      )}
    </div>
  );
}