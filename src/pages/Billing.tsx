import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Loader2 } from "lucide-react";
import { SettingsSideNav } from "@/components/settings/SettingsSideNav";
import { MandateBlock } from "@/components/settings/MandateBlock";
import { useExtraCreditPurchases } from "@/hooks/useExtraCredits";
import { useAuth } from "@/contexts/AuthContext";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PRICE_PER_DOSSIER_EUR = 4.99;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Billing = () => {
  const { data: purchases } = useExtraCreditPurchases();
  const { user, profile } = useAuth();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const [qty, setQty] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();

  useEffect(() => {
    if (searchParams.get("purchase") === "success") {
      toast.success("Zahlung erhalten — Dossiers werden gutgeschrieben.");
      // Refetch profile + purchases shortly after to allow webhook to land
      const t = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["extra-credit-purchases"] });
        qc.invalidateQueries({ queryKey: ["profile"] });
      }, 2500);
      const params = new URLSearchParams(searchParams);
      params.delete("purchase");
      params.delete("session_id");
      setSearchParams(params, { replace: true });
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams, qc]);

  const isPro = profile?.plan_id === "pro";
  const total = (qty * PRICE_PER_DOSSIER_EUR).toFixed(2).replace(".", ",");

  const buy = () => {
    if (!user) return;
    openCheckout({
      priceId: "extra_dossier_single",
      quantity: qty,
      customerEmail: user.email ?? undefined,
      returnUrl: `${window.location.origin}/app/billing?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(10, q + 1));

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="grid lg:grid-cols-[260px_1fr] gap-12">
        <SettingsSideNav active="billing" />
        <section>
          <h1 className="font-serif text-4xl md:text-5xl mb-12">Plan &amp; Abrechnung</h1>

          <MandateBlock />

          {isPro && (
            <div className="mt-12 border border-primary/20 rounded-sm p-6 bg-primary/[0.03]">
              <p className="font-mono-label text-primary mb-2">Zusatz-Dossiers erwerben</p>
              <p className="text-foreground/85 text-[15px] leading-7 mb-6">
                Verstärken Sie Ihr Mandat — zusätzliche Dossiers für den laufenden Abrechnungszeitraum.
                Sie verfallen mit Periodenende.
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center border border-border/40 rounded-sm">
                  <button
                    onClick={dec}
                    disabled={qty <= 1}
                    className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Weniger"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-6 py-2 font-serif text-2xl min-w-[80px] text-center">
                    {qty}
                  </span>
                  <button
                    onClick={inc}
                    disabled={qty >= 10}
                    className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Mehr"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <p className="font-mono-label text-muted-foreground text-xs">Gesamt</p>
                  <p className="font-serif text-2xl">{total} €</p>
                  <p className="text-muted-foreground/60 text-xs">
                    {qty} × 4,99 € — einmalig
                  </p>
                </div>
                <Button variant="gold" onClick={buy} className="ml-auto">
                  Jetzt erwerben
                </Button>
              </div>
            </div>
          )}

          <div className="mt-12">
            <p className="font-mono-label text-muted-foreground mb-4">Gekaufte Zusatz-Dossiers</p>
            {!purchases || purchases.length === 0 ? (
              <p className="text-muted-foreground/70 text-[15px]">
                Noch keine Zusatz-Dossiers erworben.
              </p>
            ) : (
              <div className="border border-border/30 rounded-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="text-left font-mono-label text-muted-foreground">
                      <th className="py-3 px-4">Datum</th>
                      <th className="py-3 px-4">Anzahl</th>
                      <th className="py-3 px-4">Betrag</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Verfällt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.id} className="border-t border-border/20">
                        <td className="py-3 px-4">{fmtDate(p.created_at)}</td>
                        <td className="py-3 px-4">{p.quantity}</td>
                        <td className="py-3 px-4">
                          {(p.amount_cents / 100).toFixed(2)} {p.currency}
                        </td>
                        <td className="py-3 px-4 capitalize">{p.status}</td>
                        <td className="py-3 px-4 text-muted-foreground">{fmtDate(p.expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={isOpen} onOpenChange={(o) => !o && closeCheckout()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Checkout</DialogTitle>
          </DialogHeader>
          {checkoutElement ?? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;