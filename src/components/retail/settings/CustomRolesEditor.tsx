import { useState } from "react";
import { useCustomRoles, useUpsertCustomRole, useDeleteCustomRole, type CustomRole } from "@/hooks/useCustomRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

export function CustomRolesEditor({ accountId, canEdit }: { accountId: string; canEdit: boolean }) {
  const { data: roles = [] } = useCustomRoles(accountId);
  const upsert = useUpsertCustomRole();
  const del = useDeleteCustomRole();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [f, setF] = useState({ role_key: "", label: "", max_discount_percent: "15", base_role: "sachbearbeiter" });

  function openNew() {
    setEditing(null);
    setF({ role_key: "", label: "", max_discount_percent: "15", base_role: "sachbearbeiter" });
    setOpen(true);
  }
  function openEdit(r: CustomRole) {
    setEditing(r);
    setF({ role_key: r.role_key, label: r.label, max_discount_percent: String(r.max_discount_percent), base_role: r.base_role });
    setOpen(true);
  }

  async function save() {
    const pct = Number(f.max_discount_percent);
    if (!f.label.trim() || !f.role_key.trim() || Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast({ title: "Bitte Label, Key und Limit (0–100) ausfüllen", variant: "destructive" }); return;
    }
    try {
      await upsert.mutateAsync({
        id: editing?.id, business_account_id: accountId,
        role_key: f.role_key, label: f.label,
        max_discount_percent: pct, base_role: f.base_role,
      });
      toast({ title: editing ? "Rolle aktualisiert" : "Rolle angelegt" });
      setOpen(false);
    } catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Eigene Rollen</CardTitle>
        {canEdit && <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Rolle</Button>}
      </CardHeader>
      <CardContent>
        {roles.length === 0 && <div className="text-sm text-muted-foreground">Noch keine eigenen Rollen. Standard sind Sachbearbeiter, Manager und Leitung.</div>}
        <div className="divide-y">
          {roles.map((r) => (
            <div key={r.id} className="py-2 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{r.label} <span className="text-xs text-muted-foreground font-mono">({r.role_key})</span></div>
                <div className="text-xs text-muted-foreground">Limit {r.max_discount_percent}% · basiert auf {r.base_role}</div>
              </div>
              {canEdit && (
                <>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm(`Rolle „${r.label}" löschen?`)) return;
                    try { await del.mutateAsync(r.id); toast({ title: "Gelöscht" }); }
                    catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
                  }}><Trash2 className="w-4 h-4" /></Button>
                </>
              )}
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Rolle bearbeiten" : "Neue Rolle"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Label</Label>
                <Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value, role_key: editing ? f.role_key : e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="z. B. Teamleiter" />
              </div>
              <div className="space-y-1"><Label>Key</Label>
                <Input value={f.role_key} onChange={(e) => setF({ ...f, role_key: e.target.value })} disabled={!!editing} placeholder="teamleiter" />
              </div>
              <div className="space-y-1"><Label>Maximaler Rabatt (%)</Label>
                <Input type="number" min={0} max={100} value={f.max_discount_percent} onChange={(e) => setF({ ...f, max_discount_percent: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>Basis-Rolle (für Berechtigungen)</Label>
                <Select value={f.base_role} onValueChange={(v) => setF({ ...f, base_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sachbearbeiter">Sachbearbeiter</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="leitung">Leitung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
              <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? "Speichere…" : "Speichern"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}