import { useMemo, useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import {
  useRoleHierarchy, useUpsertRole, useToggleRoleActive, useDeleteRole, useReorderRoles, type RoleRow,
} from "@/hooks/useRoleHierarchy";

function Row({ r, canEdit, onEdit, onToggle, onDelete }: {
  r: RoleRow; canEdit: boolean;
  onEdit: (r: RoleRow) => void; onToggle: (r: RoleRow) => void; onDelete: (r: RoleRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: r.id, disabled: !canEdit || (r.is_builtin && r.base_role === "leitung") });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const isLeitung = r.is_builtin && r.base_role === "leitung";
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 border-b last:border-b-0 bg-card">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground disabled:opacity-30" disabled={!canEdit || isLeitung} aria-label="Verschieben">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{r.label}</span>
          {r.is_builtin && <Badge variant="outline" className="text-xs">Standard</Badge>}
          {!r.is_active && <Badge variant="secondary" className="text-xs">Deaktiviert</Badge>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">Rabatt-Limit {r.max_discount_percent}%</div>
      </div>
      {canEdit && !isLeitung && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch checked={r.is_active} onCheckedChange={() => onToggle(r)} />
            <span className="text-xs text-muted-foreground">aktiv</span>
          </div>
          <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="w-4 h-4" /></Button>
          {!r.is_builtin && (
            <Button size="icon" variant="ghost" onClick={() => onDelete(r)}><Trash2 className="w-4 h-4" /></Button>
          )}
        </div>
      )}
      {canEdit && isLeitung && <Badge variant="outline" className="text-xs">unveränderlich</Badge>}
    </div>
  );
}

export function RoleHierarchyEditor({ accountId, canEdit }: { accountId: string; canEdit: boolean }) {
  const { data: roles = [] } = useRoleHierarchy(accountId);
  const upsert = useUpsertRole();
  const toggle = useToggleRoleActive();
  const del = useDeleteRole();
  const reorder = useReorderRoles();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [f, setF] = useState({ role_key: "", label: "", max_discount_percent: "15", base_role: "sachbearbeiter" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const ordered = useMemo(() => [...roles].sort((a, b) => b.rank - a.rank), [roles]);

  function openNew() {
    setEditing(null);
    setF({ role_key: "", label: "", max_discount_percent: "15", base_role: "sachbearbeiter" });
    setOpen(true);
  }
  function openEdit(r: RoleRow) {
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
        max_discount_percent: pct, base_role: f.base_role as "sachbearbeiter" | "manager" | "leitung",
      });
      toast({ title: editing ? "Rolle aktualisiert" : "Rolle angelegt" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Fehler", description: humanError(e.message), variant: "destructive" });
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((r) => r.id === active.id);
    const newIndex = ordered.findIndex((r) => r.id === over.id);
    const newOrder = arrayMove(ordered, oldIndex, newIndex);
    // Leitung must stay top
    const leitungIdx = newOrder.findIndex((r) => r.is_builtin && r.base_role === "leitung");
    if (leitungIdx > 0) {
      toast({ title: "Leitung muss oberste Stufe bleiben", variant: "destructive" });
      return;
    }
    try {
      await reorder.mutateAsync({ accountId, orderedIds: newOrder.map((r) => r.id) });
    } catch (e: any) {
      toast({ title: "Fehler beim Sortieren", description: humanError(e.message), variant: "destructive" });
    }
  }

  async function onToggle(r: RoleRow) {
    try { await toggle.mutateAsync({ id: r.id, is_active: !r.is_active }); }
    catch (e: any) { toast({ title: "Fehler", description: humanError(e.message), variant: "destructive" }); }
  }
  async function onDelete(r: RoleRow) {
    if (!confirm(`Rolle „${r.label}" löschen?`)) return;
    try { await del.mutateAsync(r.id); toast({ title: "Gelöscht" }); }
    catch (e: any) { toast({ title: "Fehler", description: humanError(e.message), variant: "destructive" }); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Rollen-Hierarchie</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Per Drag & Drop sortieren. Höhere Stufe = höheres Rabatt-Limit (strikt aufsteigend).</p>
        </div>
        {canEdit && <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Rolle</Button>}
      </CardHeader>
      <CardContent className="p-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ordered.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {ordered.map((r) => (
              <Row key={r.id} r={r} canEdit={canEdit} onEdit={openEdit} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </SortableContext>
        </DndContext>

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
                <p className="text-xs text-muted-foreground">Muss ≥ Limit niedrigerer Stufen und ≤ Limit höherer Stufen sein.</p>
              </div>
              <div className="space-y-1"><Label>Basis-Rolle (steuert Berechtigungen)</Label>
                <Select value={f.base_role} onValueChange={(v) => setF({ ...f, base_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sachbearbeiter">Sachbearbeiter</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
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

function humanError(msg: string): string {
  if (!msg) return "Unbekannter Fehler";
  if (msg.includes("leitung_role_cannot_be_deleted")) return "Die Leitungs-Rolle kann nicht gelöscht werden.";
  if (msg.includes("leitung_role_cannot_be_deactivated")) return "Die Leitungs-Rolle kann nicht deaktiviert werden.";
  if (msg.includes("rank_limit_below_subordinate")) return "Limit darf nicht unter dem einer rangniedrigeren Rolle liegen.";
  if (msg.includes("rank_limit_above_superior")) return "Limit darf nicht über dem einer ranghöheren Rolle liegen.";
  if (msg.includes("business_custom_roles_account_rank_unique")) return "Rang-Konflikt — bitte erneut versuchen.";
  return msg;
}