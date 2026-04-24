import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { status: "validating" }
  | { status: "valid" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "already" }
  | { status: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ status: "validating" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Kein Token in der URL gefunden." });
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(
            token,
          )}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.valid) setState({ status: "valid" });
        else if (data?.reason === "already_unsubscribed")
          setState({ status: "already" });
        else
          setState({
            status: "error",
            message: data?.error ?? "Ungültiger oder abgelaufener Link.",
          });
      } catch {
        setState({
          status: "error",
          message: "Verbindung fehlgeschlagen. Bitte später erneut versuchen.",
        });
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ status: "submitting" });
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) setState({ status: "success" });
      else if (data?.reason === "already_unsubscribed")
        setState({ status: "already" });
      else
        setState({
          status: "error",
          message: data?.error ?? "Abmeldung fehlgeschlagen.",
        });
    } catch {
      setState({
        status: "error",
        message: "Verbindung fehlgeschlagen.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-16">
      <div className="max-w-md w-full text-center">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>

        <div className="border border-border/50 bg-card p-10 rounded-sm">
          {state.status === "validating" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Link wird geprüft …</p>
            </>
          )}

          {state.status === "valid" && (
            <>
              <h1 className="text-2xl font-serif italic text-primary mb-4">
                Abmeldung bestätigen
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Sie sind dabei, sich von zukünftigen E-Mails von PALLANX abzumelden.
                Wichtige Konto- und Sicherheitsbenachrichtigungen erhalten Sie
                weiterhin.
              </p>
              <Button onClick={confirm} className="w-full">
                Abmeldung bestätigen
              </Button>
            </>
          )}

          {state.status === "submitting" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Wird verarbeitet …</p>
            </>
          )}

          {state.status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-serif italic text-primary mb-3">
                Erfolgreich abgemeldet
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Sie erhalten von uns keine weiteren E-Mails dieser Art.
              </p>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  Zur Startseite
                </Button>
              </Link>
            </>
          )}

          {state.status === "already" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-xl font-serif italic mb-3">Bereits abgemeldet</h1>
              <p className="text-sm text-muted-foreground mb-8">
                Diese E-Mail-Adresse ist bereits aus unserer Liste entfernt.
              </p>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  Zur Startseite
                </Button>
              </Link>
            </>
          )}

          {state.status === "error" && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-serif italic mb-3">Fehler</h1>
              <p className="text-sm text-muted-foreground mb-8">{state.message}</p>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  Zur Startseite
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}