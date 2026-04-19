import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CheckEmail = () => {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    if (!email) {
      toast.error("Keine Email-Adresse hinterlegt.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast.error(`Fehler: ${error.message}`);
    } else {
      toast.success("Bestätigungs-Email erneut gesendet.");
      setCooldown(60);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/40">
        <Logo />
        <div>
          <p className="font-mono-label text-primary mb-6">◆ Verifizierungs-Phase</p>
          <blockquote className="font-serif italic text-3xl leading-tight max-w-md">
            "Vertrauen ist die seltenste Währung. Sie wird nicht beansprucht — sie wird verifiziert."
          </blockquote>
          <div className="flex items-center gap-4 mt-8">
            <span className="w-12 h-px bg-primary" />
            <span className="font-mono-label text-primary">Identitäts-Protokoll 002</span>
          </div>
        </div>
        <span className="font-mono-label text-muted-foreground">◆ Secure_Server_A12 — Awaiting Confirmation</span>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Mail className="w-10 h-10 text-primary mb-6" strokeWidth={1.5} />
          <h1 className="font-serif text-5xl mb-3">Identität bestätigen</h1>
          <p className="font-mono-label text-primary mb-10">
            Bestätigungs-Link gesendet
          </p>
          <p className="font-serif italic text-lg leading-relaxed text-foreground/80 mb-10">
            Wir haben einen Bestätigungs-Link an{" "}
            <span className="text-primary not-italic">{email || "deine Adresse"}</span>{" "}
            gesendet. Öffne die Nachricht, um Zugang zum Terminal zu erhalten.
          </p>

          <Button
            variant="gold-outline"
            size="xl"
            className="w-full mb-4"
            onClick={resend}
            disabled={resending || cooldown > 0}
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Wird gesendet…
              </>
            ) : cooldown > 0 ? (
              `Erneut senden (${cooldown}s)`
            ) : (
              "Email erneut senden"
            )}
          </Button>

          <p className="text-center font-mono-label text-muted-foreground pt-4">
            Falsche Email-Adresse?{" "}
            <Link to="/register" className="text-primary hover:underline ml-2">
              Zurück zur Registrierung
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckEmail;
