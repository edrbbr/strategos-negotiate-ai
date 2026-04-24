import { useState } from "react";
import { Loader2, Check, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BillingCycle } from "@/hooks/usePlans";

export interface AppliedDiscount {
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  currency: string;
  duration: string;
  duration_in_months: number | null;
}

interface DiscountCodeFieldProps {
  planId: string;
  cycle: BillingCycle;
  applied: AppliedDiscount | null;
  onApplied: (d: AppliedDiscount | null) => void;
}

const reasonLabel: Record<string, string> = {
  not_found: "Code unbekannt",
  not_yet_valid: "Code noch nicht gültig",
  expired: "Code abgelaufen",
  global_limit_reached: "Code-Kontingent ausgeschöpft",
  plan_not_applicable: "Code nicht für diesen Plan gültig",
  cycle_not_applicable: "Code nicht für diesen Abrechnungsrhythmus gültig",
  already_redeemed: "Code bereits eingelöst",
};

export const DiscountCodeField = ({
  planId,
  cycle,
  applied,
  onApplied,
}: DiscountCodeFieldProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setError(null);
    if (!user) {
      setError("Bitte zuerst anmelden.");
      return;
    }
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc(
      "validate_discount_code",
      {
        p_user_id: user.id,
        p_code: trimmed,
        p_plan_id: planId,
        p_billing_cycle: cycle,
      },
    );
    setLoading(false);
    if (rpcError) {
      setError("Validierung fehlgeschlagen.");
      return;
    }
    const v = data as Record<string, unknown> | null;
    if (!v?.valid) {
      setError(reasonLabel[(v?.reason as string) ?? ""] ?? "Code ungültig");
      return;
    }
    onApplied({
      code: (v.code as string) ?? trimmed,
      percent_off: (v.percent_off as number | null) ?? null,
      amount_off_cents: (v.amount_off_cents as number | null) ?? null,
      currency: ((v.currency as string) ?? "EUR").toUpperCase(),
      duration: (v.duration as string) ?? "once",
      duration_in_months: (v.duration_in_months as number | null) ?? null,
    });
    setCode("");
  };

  if (applied) {
    const valueLabel = applied.percent_off
      ? `−${applied.percent_off}%`
      : applied.amount_off_cents
        ? `−${(applied.amount_off_cents / 100).toFixed(2)} ${applied.currency}`
        : "Rabatt aktiv";
    const durationLabel =
      applied.duration === "forever"
        ? "dauerhaft"
        : applied.duration === "repeating"
          ? `${applied.duration_in_months ?? ""} Mon.`
          : "einmalig";
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-foreground">
          <Check className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono-label tracking-[0.18em]">
            {applied.code}
          </span>
          <span className="text-primary font-semibold">{valueLabel}</span>
          <span className="text-muted-foreground">({durationLabel})</span>
        </div>
        <button
          type="button"
          aria-label="Code entfernen"
          onClick={() => onApplied(null)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-sans uppercase tracking-[0.18em]"
      >
        <Tag className="w-3 h-3" />
        Rabattcode
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          className="h-9 text-xs font-mono tracking-[0.15em] uppercase"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleApply();
          }}
          autoFocus
        />
        <Button
          type="button"
          variant="gold-outline"
          size="sm"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="h-9 px-3"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Anwenden"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};