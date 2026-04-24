import { SettingsSideNav } from "@/components/settings/SettingsSideNav";
import { MandateBlock } from "@/components/settings/MandateBlock";
import { useExtraCreditPurchases } from "@/hooks/useExtraCredits";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Billing = () => {
  const { data: purchases } = useExtraCreditPurchases();

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="grid lg:grid-cols-[260px_1fr] gap-12">
        <SettingsSideNav active="billing" />
        <section>
          <h1 className="font-serif text-4xl md:text-5xl mb-12">Plan &amp; Abrechnung</h1>

          <MandateBlock />

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
    </div>
  );
};

export default Billing;