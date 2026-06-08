import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDecideCase, type BusinessCase } from "@/hooks/useBusinessCases";
import { useToast } from "@/hooks/use-toast";
import { parseEuroInput, formatEuro, formatEuroPlain } from "@/lib/euro";

export function CloseCaseModal({
  open, onOpenChange, caseRow, defaultAmount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseRow: BusinessCase;
  defaultAmount?: number | null;
}) {
  const decide = useDecideCase();
  const { toast } = useToast();
  const [amountStr, setAmountStr] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      const init = defaultAmount ?? caseRow.suggested_offer ?? caseRow.claimed_amount ?? 0;
      setAmountStr(formatEuroPlain(init));
      setNotes("");
    }
  }, [open, defaultAmount, caseRow.suggested_offer, caseRow.claimed_amount]);

  const parsed = parseEuroInput(amountStr);
  const purchase = Number(caseRow.purchase_price_total) || 0;
  const percent = purchase > 0 && parsed != null ? (parsed / purchase) * 100 : 0;
  const saved = (Number(caseRow.claimed_amount) || 0) - (parsed ?? 0);

  async function submit() {
    if (parsed == null) {
      toast({ title: "Ungültiger Betrag", description: "Bitte einen gültigen Euro-Betrag eingeben (z. B. 129,50).", variant: "destructive" });
      return;
    }
    try {
      await decide.mutateAsync({
        case_id: caseRow.id,
        final_amount: parsed,
        final_percent: Number(percent.toFixed(2)),
        notes: notes || undefined,
      });
      toast({ title: "Fall abgeschlossen", description: `Endbetrag: ${formatEuro(parsed)} · Ersparnis: ${formatEuro(Math.max(0, saved))}` });
      onOpenChange(false);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("exceeds_limit")) {
        toast({ title: "Über deinem Limit", description: "Bitte zuerst eine Genehmigung einholen.", variant: "destructive" });
      } else {
        toast({ title: "Fehler", description: msg, variant: "destructive" });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Fall als abgeschlossen markieren</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Kaufpreis: <span className="font-medium text-foreground">{formatEuro(purchase)}</span> · Forderung: <span className="font-medium text-foreground">{formatEuro(caseRow.claimed_amount)}</span>
          </div>
          <div className="space-y-1">
            <Label>Tatsächlich verhandelter Betrag (€)</Label>
            <Input
              inputMode="decimal"
              placeholder="z. B. 129,50"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
            />
            <div className="text-xs text-muted-foreground">
              {parsed != null ? (
                <>= {formatEuro(parsed)} ({percent.toFixed(1)} % vom Kaufpreis) · Ersparnis ggü. Forderung: <span className={saved >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>{formatEuro(Math.max(0, saved))}</span></>
              ) : <span className="text-destructive">Kein gültiger Betrag</span>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notiz (optional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wie wurde verhandelt? Was hat der Kunde akzeptiert?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={decide.isPending}>Abbrechen</Button>
          <Button onClick={submit} disabled={decide.isPending || parsed == null}>{decide.isPending ? "Speichere…" : "Abschließen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}