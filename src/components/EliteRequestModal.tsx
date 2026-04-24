import { useEffect, useState } from "react";
import { Loader2, Crown, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_CASES = [
  { value: "salary", label: "Gehalt & Karriere" },
  { value: "ma", label: "M&A / Unternehmensdeals" },
  { value: "legal", label: "Recht & Compliance" },
  { value: "politics", label: "Politik & Diplomatie" },
  { value: "other", label: "Sonstiges" },
];

const VOLUMES = [
  { value: "1-5", label: "1 – 5 pro Monat" },
  { value: "6-20", label: "6 – 20 pro Monat" },
  { value: "20+", label: "Mehr als 20 pro Monat" },
];

const ELITE_VALUE_PROPS = [
  "Multi-Stage-KI-Pipeline mit spezialisierten Modellen je Phase",
  "Unbegrenzte Dossiers, kein Monatszähler",
  "Persönliche Aufnahme nach Eignungsprüfung",
  "Aufnahme limitiert — Plätze werden gezielt vergeben",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const EliteRequestModal = ({ open, onOpenChange }: Props) => {
  const { user, profile } = useAuth();

  const [profession, setProfession] = useState("");
  const [useCase, setUseCase] = useState("");
  const [volume, setVolume] = useState("");
  const [pain, setPain] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Prefill from auth profile whenever the modal opens
  useEffect(() => {
    if (open) {
      setContactEmail(user?.email ?? "");
      setFullName(profile?.full_name ?? "");
    }
  }, [open, user?.email, profile?.full_name]);

  const reset = () => {
    setProfession("");
    setUseCase("");
    setVolume("");
    setPain("");
    setContactEmail("");
    setFullName("");
    setDone(false);
  };

  const close = (o: boolean) => {
    if (!o) setTimeout(reset, 200);
    onOpenChange(o);
  };

  const submit = async () => {
    if (!user) return;
    if (
      !fullName.trim() ||
      !contactEmail.trim() ||
      !profession.trim() ||
      !useCase ||
      !volume ||
      !pain.trim()
    ) {
      toast.error("Bitte alle Felder ausfüllen.");
      return;
    }
    // basic email sanity
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      toast.error("Bitte eine gültige E-Mail-Adresse angeben.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("elite_requests").insert({
      user_id: user.id,
      full_name: fullName.trim(),
      email: contactEmail.trim(),
      profession: profession.trim(),
      primary_use_case: useCase,
      monthly_negotiation_volume: volume,
      biggest_pain_point: pain.trim().slice(0, 280),
      status: "pending",
    });

    if (error) {
      setSubmitting(false);
      toast.error(`Anfrage fehlgeschlagen: ${error.message}`);
      return;
    }

    // Fire-and-forget: notify admin
    supabase.functions.invoke("notify-elite-request-admin", {
      body: { user_email: contactEmail.trim(), full_name: fullName.trim() },
    }).catch(() => undefined);

    setSubmitting(false);
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-center">
                Anfrage übermittelt
              </DialogTitle>
            </DialogHeader>
            <p className="text-foreground/85 text-[15px] leading-7 max-w-md mx-auto">
              Ihre Anfrage wird geprüft. Bei Eignung erhalten Sie binnen
              48 Stunden eine persönliche Einladung an{" "}
              <span className="text-primary">{contactEmail || user?.email}</span>.
            </p>
            <Button variant="gold-outline" onClick={() => close(false)}>
              Schließen
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Imperialer Zugang ist limitiert
              </DialogTitle>
            </DialogHeader>
            <ul className="space-y-2 mb-2">
              {ELITE_VALUE_PROPS.map((v) => (
                <li key={v} className="flex gap-3 text-foreground/85 text-sm leading-6">
                  <span className="text-primary mt-1">◆</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-5 mt-4">
              <div>
                <label className="font-mono-label text-muted-foreground">
                  Beruf / Position
                </label>
                <input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="z.B. Geschäftsführer, Anwältin, Negotiator"
                  className="w-full bg-transparent border-0 border-b border-border/40 py-2 text-base focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono-label text-muted-foreground">
                  Hauptanwendungsfall
                </label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-border/40 py-2 text-base focus:border-primary focus:outline-none"
                >
                  <option value="">Wählen…</option>
                  {USE_CASES.map((u) => (
                    <option key={u.value} value={u.value} className="bg-background">
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono-label text-muted-foreground">
                  Verhandlungs-Volumen
                </label>
                <select
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-border/40 py-2 text-base focus:border-primary focus:outline-none"
                >
                  <option value="">Wählen…</option>
                  {VOLUMES.map((v) => (
                    <option key={v.value} value={v.value} className="bg-background">
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono-label text-muted-foreground">
                  Größte aktuelle Herausforderung
                </label>
                <textarea
                  value={pain}
                  onChange={(e) => setPain(e.target.value.slice(0, 280))}
                  placeholder="In ein bis zwei Sätzen — was bringt Sie hierher?"
                  rows={3}
                  className="w-full bg-transparent border border-border/40 rounded-sm p-3 text-sm focus:border-primary focus:outline-none resize-none"
                />
                <p className="font-mono-label text-muted-foreground/60 text-right mt-1">
                  {pain.length} / 280
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <button
                onClick={() => close(false)}
                className="font-mono-label text-muted-foreground hover:text-foreground"
              >
                Abbrechen
              </button>
              <Button variant="gold" onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Anfrage senden
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};