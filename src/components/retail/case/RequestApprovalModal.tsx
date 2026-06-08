import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRequestApproval, type BusinessCase } from "@/hooks/useBusinessCases";
import { useToast } from "@/hooks/use-toast";
import { parseEuroInput, formatEuroPlain } from "@/lib/euro";

export function RequestApprovalModal({
  open, onOpenChange, caseRow,
}: { open: boolean; onOpenChange: (v: boolean) => void; caseRow: BusinessCase }) {
  const req = useRequestApproval();
  const { toast } = useToast();
  const [amountStr, setAmountStr] = useState(formatEuroPlain(caseRow.suggested_offer ?? caseRow.claimed_amount ?? 0));
  const [justification, setJustification] = useState("");

  const parsed = parseEuroInput(amountStr);
  const purchase = Number(caseRow.purchase_price_total) || 0;
  const percent = purchase > 0 && parsed != null ? (parsed / purchase) * 100 : 0;

  async function submit() {
    if (parsed == null) { toast({ title: "Ungültiger Betrag", variant: "destructive" }); return; }
    if (justification.trim().length < 3) { toast({ title: "Bitte kurz begründen", variant: "destructive" }); return; }
    try {
      await req.mutateAsync({
        case_id: caseRow.id,
        requested_amount: parsed,
        requested_percent: Number(percent.toFixed(2)),
        justification,
      });
      toast({ title: "Genehmigung angefragt", description: "Manager/Leitung wurde informiert." });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Genehmigung einholen</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Betrag, für den du Freigabe brauchst (€)</Label>
            <Input inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
            {parsed != null && <div className="text-xs text-muted-foreground">= {percent.toFixed(1)} % vom Kaufpreis</div>}
          </div>
          <div className="space-y-1">
            <Label>Worum bittest du? (kurze Begründung)</Label>
            <Textarea rows={4} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="z. B. Stammkunde seit 5 Jahren, Vorgang würde sonst eskalieren …" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={req.isPending}>Abbrechen</Button>
          <Button onClick={submit} disabled={req.isPending}>{req.isPending ? "Sende…" : "Anfragen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}