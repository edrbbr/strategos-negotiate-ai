import { useState } from "react";
import { useIndustries, useCreateIndustry } from "@/hooks/useIndustries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function IndustryPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const { data: industries = [] } = useIndustries();
  const create = useCreateIndustry();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ key: "", label: "", ai_context: "" });

  async function submit() {
    if (!f.label.trim() || !f.key.trim()) { toast({ title: "Schlüssel und Label nötig", variant: "destructive" }); return; }
    try {
      const { key } = await create.mutateAsync(f);
      toast({ title: "Branche angelegt" });
      onChange(key);
      setOpen(false); setF({ key: "", label: "", ai_context: "" });
    } catch (e: any) { toast({ title: "Fehler", description: e.message, variant: "destructive" }); }
  }

  return (
    <div className="flex gap-2 items-center">
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Branche wählen…" /></SelectTrigger>
        <SelectContent>
          {industries.map((i) => <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button type="button" size="icon" variant="outline" onClick={() => setOpen(true)} title="Neue Branche hinzufügen">
        <Plus className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Neue Branche anlegen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Label</Label><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value, key: f.key || e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="z. B. Sanitärgroßhandel" /></div>
            <div className="space-y-1"><Label>Schlüssel</Label><Input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} placeholder="z. B. sanitaer_grosshandel" /></div>
            <div className="space-y-1"><Label>AI-Kontext (Branchen-Leitplanken für die KI)</Label><Textarea rows={5} value={f.ai_context} onChange={(e) => setF({ ...f, ai_context: e.target.value })} placeholder="Welche Rechtsnormen, branchentypischen Fälle und Verhandlungsleitplanken soll die KI berücksichtigen?" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>Abbrechen</Button>
            <Button onClick={submit} disabled={create.isPending}>{create.isPending ? "Speichere…" : "Anlegen"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}