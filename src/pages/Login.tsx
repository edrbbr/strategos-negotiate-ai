import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LogIn, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { hasFirstCasePrefill } from "@/lib/firstCaseFlow";
import { track } from "@/lib/analytics";

const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // If the user arrived from the landing hero with a stashed situation,
  // skip the dashboard and drop them straight into a pre-filled new case.
  const fromParam = params.get("returnUrl");
  // If user has stashed first-case prefill, honour that flow; otherwise route
  // via /select-context which auto-redirects based on B2C/B2B entitlements.
  const returnUrl = fromParam || (hasFirstCasePrefill() ? "/app/case/new" : "/select-context");
  const { signInWithEmail, signInWithGoogle, signInWithApple, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(returnUrl, { replace: true });
  }, [isAuthenticated, navigate, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirm(false);
    setLoading(true);
    const { error: err } = await signInWithEmail(email, password);
    setLoading(false);
    if (err) {
      if (/confirm/i.test(err) || /not confirmed/i.test(err)) {
        setNeedsConfirm(true);
        setError("Email noch nicht bestätigt.");
      } else {
        setError("Zugang verweigert. Identität nicht verifizierbar.");
      }
      return;
    }
    track("login_completed", { method: "email" });
    navigate(returnUrl, { replace: true });
  };

  const resendConfirm = async () => {
    const { error: err } = await supabase.auth.resend({ type: "signup", email });
    if (err) toast.error(err.message);
    else toast.success("Bestätigungs-Email erneut gesendet.");
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: err, redirected } = await signInWithGoogle();
    if (redirected) {
      // Browser is navigating away — keep spinner until unload.
      return;
    }
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const handleApple = async () => {
    setLoading(true);
    setError(null);
    const { error: err, redirected } = await signInWithApple();
    if (redirected) return;
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <Seo
        title="Login — PALLANX Terminal"
        description="Zugang zum PALLANX Verhandlungs-Terminal. Sicheres Login für autorisierte Mandate."
        path="/login"
      />
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/40">
        <Link to="/" aria-label="Zur Startseite">
          <Logo />
        </Link>
        <div>
          <p className="font-mono-label text-muted-foreground mb-6">Souveränes Verhandlungssystem v.2.4</p>
          <blockquote className="font-serif italic text-3xl leading-tight max-w-md">
            "In der Stille der Vorbereitung wird der Sieg geschmiedet, bevor das erste Wort gesprochen ist."
          </blockquote>
          <div className="flex items-center gap-4 mt-8">
            <span className="w-12 h-px bg-primary" />
            <span className="font-mono-label text-primary">Strategie-Protokoll 001</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 max-w-xs font-mono-label text-muted-foreground">
          <div>
            <p className="mb-1">Version</p>
            <p className="text-foreground">882-X9-Elite</p>
          </div>
          <div>
            <p className="mb-1">Stufe</p>
            <p className="text-foreground">Maximum Security</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono-label text-muted-foreground hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Zurück zur Startseite
          </Link>
          <h1 className="font-serif text-5xl mb-3">Willkommen zurück</h1>
          <p className="font-mono-label text-primary mb-12">
            Identität bestätigen <span className="text-muted-foreground">·</span> Terminal Zugriff
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="font-mono-label text-muted-foreground mb-2 block">Email Adresse</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.com"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/40 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono-label text-muted-foreground">Passwort</label>
                <Link to="/passwort-vergessen" className="font-mono-label text-muted-foreground hover:text-primary">Vergessen?</Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg tracking-widest placeholder:text-muted-foreground/40 transition-colors"
              />
            </div>

            {error && (
              <div className="border-l-2 border-destructive bg-destructive/10 px-4 py-3 font-mono-label text-destructive text-xs">
                {error}
                {needsConfirm && (
                  <button
                    type="button"
                    onClick={resendConfirm}
                    className="block mt-2 text-primary hover:underline"
                  >
                    Bestätigungs-Email erneut senden
                  </button>
                )}
              </div>
            )}

            <Button type="submit" variant="gold-outline" size="xl" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Anmelden
            </Button>

            <div className="flex items-center gap-4">
              <span className="flex-1 h-px bg-border/40" />
              <span className="font-mono-label text-muted-foreground">Oder</span>
              <span className="flex-1 h-px bg-border/40" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full border border-border/60 hover:border-primary/40 py-3 flex items-center justify-center gap-3 font-sans uppercase tracking-[0.2em] text-xs text-foreground hover:text-primary transition-colors rounded-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Zugang
            </button>

            <button
              type="button"
              onClick={handleApple}
              disabled={loading}
              className="w-full border border-border/60 hover:border-primary/40 py-3 flex items-center justify-center gap-3 font-sans uppercase tracking-[0.2em] text-xs text-foreground hover:text-primary transition-colors rounded-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.01-.81.85-2.16 1.51-3.27 1.42-.13-1.09.41-2.23 1.16-2.96.83-.83 2.27-1.45 3.32-1.47zM20.5 17.27c-.6 1.38-.88 2-1.65 3.22-1.08 1.7-2.6 3.82-4.48 3.84-1.67.02-2.1-1.09-4.36-1.08-2.26.01-2.74 1.1-4.41 1.08-1.88-.02-3.32-1.93-4.4-3.63C-1.04 16.83-1.36 11.5 1.39 8.69c1.6-1.63 4.13-2.45 6.06-1.31.86.51 1.78.86 2.7.85.92-.01 1.79-.36 2.69-.86 1.27-.7 3.07-.91 4.55-.19-1.27.78-2.74 2.29-2.7 4.45.05 2.58 2.39 3.45 2.6 3.64z" />
              </svg>
              Apple Zugang
            </button>

            <p className="text-center font-mono-label text-muted-foreground pt-4">
              Kein Account?{" "}
              <Link to="/register" className="text-primary hover:underline ml-2">Jetzt Registrieren</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
