import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessMembership, roleLabel, roleRank } from "@/hooks/useBusinessAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserCircle } from "lucide-react";
import { useRoleHierarchy } from "@/hooks/useRoleHierarchy";

export default function RetailTeam() {
  const { data: m } = useBusinessMembership();
  const qc = useQueryClient();
  const { toast } = useToast();
  const accountId = m?.business_account_id;
  const canManage = m && roleRank[m.role] >= 2;
  const { data: allRoles = [] } = useRoleHierarchy(accountId);
  const customRoles = allRoles.filter((r) => !r.is_builtin && r.is_active);

  const { data: team } = useQuery({
    queryKey: ["business-team", accountId], enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_users").select("*").eq("business_account_id", accountId!).order("role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [show, setShow] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", role: "sachbearbeiter", custom_role_key: "", temp_password: "" });
  const [loading, setLoading] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { full_name: f.full_name, email: f.email, role: f.role, temp_password: f.temp_password };
      if (f.custom_role_key) payload.custom_role_key = f.custom_role_key;
      const { data, error } = await supabase.functions.invoke("b2b-invite-user", { body: payload });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast({ title: "Eingeladen", description: `${f.email} wurde hinzugefügt. Temp-Passwort weitergeben.` });
      setShow(false); setF({ full_name: "", email: "", role: "sachbearbeiter", custom_role_key: "", temp_password: "" });
      qc.invalidateQueries({ queryKey: ["business-team"] });
    } catch (err: any) { toast({ title: "Fehler", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">Mitarbeitende und Rollen.</p>
        </div>
        {canManage && <Button onClick={() => setShow(!show)}><Plus className="w-4 h-4 mr-2" />Hinzufügen</Button>}
      </div>

      {show && canManage && (
        <Card><CardHeader><CardTitle>Neue:n Mitarbeitende:n hinzufügen</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={invite} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
                <div><Label>E-Mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
                <div><Label>Rolle</Label>
                  <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sachbearbeiter">Sachbearbeiter:in</SelectItem>
                      <SelectItem value="manager">Manager:in</SelectItem>
                      {m?.role === "leitung" && <SelectItem value="leitung">Leitung</SelectItem>}
                      <SelectItem value="support_readonly">Support (Lese-Zugriff)</SelectItem>
                    </SelectContent>
                  </Select></div>
                {customRoles.length > 0 && (
                  <div><Label>Eigene Rolle (optional, überschreibt Limit)</Label>
                    <Select value={f.custom_role_key || "__none__"} onValueChange={(v) => setF({ ...f, custom_role_key: v === "__none__" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— keine —</SelectItem>
                        {customRoles.map((r) => <SelectItem key={r.id} value={r.role_key}>{r.label} ({r.max_discount_percent}%)</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                )}
                <div><Label>Temporäres Passwort</Label><Input type="text" value={f.temp_password} onChange={(e) => setF({ ...f, temp_password: e.target.value })} required minLength={8} /></div>
              </div>
              <Button type="submit" disabled={loading}>{loading ? "Erstellt..." : "Einladen"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-0">
        <div className="divide-y">
          {(team ?? []).map((u: any) => (
            <div key={u.id} className="p-4 flex items-center gap-3">
              <UserCircle className="w-8 h-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{u.full_name} {u.is_primary_contact && <Badge variant="outline" className="ml-2 text-xs">Primär</Badge>}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <Badge>{roleLabel[u.role as keyof typeof roleLabel]}</Badge>
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}