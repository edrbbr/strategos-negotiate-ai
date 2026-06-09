import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export function RoleAdminsSection({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useQuery({
    queryKey: ["business-settings-admins", accountId],
    queryFn: async () => (await (supabase as any).from("business_settings").select("role_admin_user_ids").eq("business_account_id", accountId).maybeSingle()).data,
  });
  const { data: managers = [] } = useQuery({
    queryKey: ["business-managers", accountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("business_users")
        .select("id, full_name, email, role").eq("business_account_id", accountId).eq("status", "active").eq("role", "manager");
      return data ?? [];
    },
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSelected(settings?.role_admin_user_ids ?? []); }, [settings]);

  function toggle(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("business_settings")
      .update({ role_admin_user_ids: selected }).eq("business_account_id", accountId);
    setSaving(false);
    if (error) toast({ title: "Fehler", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Gespeichert" });
      qc.invalidateQueries({ queryKey: ["business-settings-admins"] });
      qc.invalidateQueries({ queryKey: ["can-manage-roles"] });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollen-Verwalter</CardTitle>
        <p className="text-xs text-muted-foreground">Manager, die zusätzlich zur Leitung Rollen anlegen, bearbeiten und löschen dürfen.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {managers.length === 0 && <div className="text-sm text-muted-foreground">Keine Manager im Team.</div>}
        <div className="space-y-2">
          {managers.map((u: any) => (
            <label key={u.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={selected.includes(u.id)} onCheckedChange={() => toggle(u.id)} />
              <span className="text-sm">{u.full_name} <span className="text-xs text-muted-foreground">({u.email})</span></span>
            </label>
          ))}
        </div>
        {managers.length > 0 && <Button size="sm" onClick={save} disabled={saving}>{saving ? "Speichere…" : "Speichern"}</Button>}
      </CardContent>
    </Card>
  );
}