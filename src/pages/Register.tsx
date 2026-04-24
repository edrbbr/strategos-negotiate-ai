import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const Register = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intendedPlan = params.get("plan");
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (intendedPlan === "pro" || intendedPlan === "elite") {
      sessionStorage.setItem("intended_plan", intendedPlan);
    }
  }, [intendedPlan]);

  const validate = (): string | null => {
    if (!fullName.trim()) return "Name erforderlich.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Ungültige Email-Adresse.";
    if (password.length < 8) return "Passwort muss mind. 8 Zeichen haben.";
    if (!/\d/.test(password)) return "Passwort muss mind. eine Zahl enthalten.";
    if (password !== confirm) return "Passwörter stimmen nicht überein.";
    if (!terms) return "Bitte akzeptiere die Bedingungen.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signUpWithEmail(email, password, fullName);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(`/check-email?email=${encodeURIComponent(email)}`);
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

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/40 scanline-bg">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Zur Startseite">
            <Logo />
          </Link>
          <span className="font-mono-label text-muted-foreground">V.6.0</span>
        </div>
        <div>
          <p className="font-mono-label text-primary mb-6">Sovereign Intelligence</p>
          <h1 className="font-serif italic text-primary text-7xl xl:text-8xl font-semibold tracking-tight mb-10">
            PALLANX
          </h1>
          <p className="font-serif text-2xl leading-snug max-w-md text-foreground/90">
            The absolute terminal for high-stakes negotiation analysis and strategic execution. Secure your seat at the table.
          </p>
          <div className="flex items-center gap-4 mt-10">
            <span className="w-16 h-px bg-primary" />
            <span className="font-mono-label text-primary">Est. MMXXVI</span>
          </div>
        </div>
        <span className="font-mono-label text-muted-foreground">◆ Secure_Server_A12 — Timestamp: 12:44:01 GMT</span>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono-label text-muted-foreground hover:text-primary mb-6 transition-colors lg:hidden"
          >
            <ArrowLeft className="w-3 h-3" />
            Zurück zur Startseite
          </Link>
          <h1 className="font-serif text-5xl mb-2">Create Account</h1>
          <p className="font-serif italic text-muted-foreground mb-10">Initialize your sovereign profile</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="font-mono-label text-muted-foreground mb-2 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="E.g. Alexander von Clausewitz"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="font-mono-label text-muted-foreground mb-2 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="font-mono-label text-muted-foreground mb-2 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg tracking-widest placeholder:text-muted-foreground/40"
                />
              </div>
              <div>
                <label className="font-mono-label text-muted-foreground mb-2 block">Confirm</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg tracking-widest placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 text-xs text-muted-foreground cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="font-serif italic">
                I accept the <a className="text-primary hover:underline">Terms of Sovereignty</a> and the <a className="text-primary hover:underline">Strategic Protocol</a>.
              </span>
            </label>

            {error && (
              <div className="border-l-2 border-destructive bg-destructive/10 px-4 py-3 font-mono-label text-destructive text-xs">
                {error}
              </div>
            )}

            <Button type="submit" variant="gold-outline" size="xl" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Account Erstellen <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-4">
              <span className="flex-1 h-px bg-border/40" />
              <span className="font-mono-label text-muted-foreground">Or Continue With</span>
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
              Google Identification
            </button>

            <p className="text-center font-serif italic text-sm text-muted-foreground pt-4">
              Already an initiate?{" "}
              <Link to="/login" className="font-sans uppercase tracking-[0.2em] text-xs text-primary hover:underline ml-2">Login Here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
