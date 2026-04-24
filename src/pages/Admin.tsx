import { useState } from "react";
import { Loader2, Send, X, Mail, Briefcase, TrendingUp, Crown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useEliteRequests, useSendEliteOffer, useDeclineEliteRequest, type EliteRequest } from "@/hooks/useEliteRequests";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STATUS_LABEL: Record<EliteRequest["status"], string> = {
  pending: "Wartend",
  sent: "Angebot gesendet",
  accepted: "Aufgenommen",
  declined: "Abgelehnt",
};

const STATUS_STYLE: Record<EliteRequest["status"], string> = {
  pending: "bg-primary/10 text-primary border-primary/30",
  sent: "bg-foreground/10 text-foreground border-foreground/20",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  declined: "bg-muted text-muted-foreground border-border",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const Admin = () => {
  const { data: requests, isLoading } = useEliteRequests();
  const sendOffer = useSendEliteOffer();
  const decline = useDeclineEliteRequest();
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  const filtered = (requests ?? []).filter((r) => (filter === "all" ? true : r.status === "pending"));

  const handleSend = async (id: string) => {
    try {
      await sendOffer.mutateAsync(id);
      toast.success("Imperiales Angebot versendet.");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes("503") || msg.toLowerCase().includes("infrastructure")) {
        toast.error("Email-Domain pallanx.com noch nicht verifiziert.");
      } else {
        toast.error(`Fehler: ${msg}`);
      }
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await decline.mutateAsync(id);
      toast.success("Anfrage abgelehnt.");
    } catch (e: any) {
      toast.error(`Fehler: ${e?.message ?? e}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <Logo subtitle="Imperial Console" />
        <Link to="/app/dashboard" className="font-mono-label text-muted-foreground hover:text-foreground">
          ← Zurück zur App
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-mono-label text-primary mb-2">Imperialer Rat</p>
            <h1 className="font-serif text-4xl md:text-5xl">Elite-Anfragen</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 font-mono-label text-xs border ${filter === "pending" ? "border-primary text-primary" : "border-border/30 text-muted-foreground"}`}
            >
              Wartend
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 font-mono-label text-xs border ${filter === "all" ? "border-primary text-primary" : "border-border/30 text-muted-foreground"}`}
            >
              Alle
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/30 rounded-sm">
            <Crown className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Keine Anfragen in dieser Kategorie.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => (
              <article key={r.id} className="border border-border/30 rounded-sm p-6 hover:border-primary/40 transition-colors">
                <header className="flex items-start justify-between gap-6 mb-4">
                  <div>
                    <h2 className="font-serif text-2xl">{r.full_name}</h2>
                    <p className="font-mono-label text-muted-foreground text-xs mt-1">
                      Eingereicht {fmt(r.created_at)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-mono-label border ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </header>

                <div className="grid md:grid-cols-3 gap-6 mb-5">
                  <div className="flex gap-3 items-start">
                    <Mail className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-mono-label text-muted-foreground text-xs">E-Mail</p>
                      <p className="text-sm">{r.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Briefcase className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-mono-label text-muted-foreground text-xs">Beruf</p>
                      <p className="text-sm">{r.profession}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <TrendingUp className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-mono-label text-muted-foreground text-xs">Volumen</p>
                      <p className="text-sm">{r.monthly_negotiation_volume}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-5 border-l-2 border-primary/30 pl-4">
                  <p className="font-mono-label text-muted-foreground text-xs mb-1">
                    Anwendungsfall: {r.primary_use_case}
                  </p>
                  <p className="text-foreground/85 text-[15px] leading-7 italic">
                    „{r.biggest_pain_point}"
                  </p>
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDecline(r.id)}
                      disabled={decline.isPending}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4 mr-2" /> Ablehnen
                    </Button>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleSend(r.id)}
                      disabled={sendOffer.isPending}
                    >
                      {sendOffer.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Imperiales Angebot senden
                    </Button>
                  </div>
                )}
                {r.status === "sent" && r.sent_at && (
                  <p className="text-right font-mono-label text-muted-foreground text-xs">
                    Gesendet {fmt(r.sent_at)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
