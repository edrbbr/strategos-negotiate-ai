import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Shield, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessMembership } from "@/hooks/useBusinessAccount";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SelectContext() {
  const { isAuthenticated, isLoading, profile, refreshProfile } = useAuth();
  const { data: membership, isLoading: mLoading } = useBusinessMembership();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const [enabling, setEnabling] = useState(false);
  const requestEnable = params.get("enable") === "b2c";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) nav("/login", { replace: true });
  }, [isLoading, isAuthenticated, nav]);

  if (isLoading || mLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const hasB2C = profile.b2c_enabled === true;
  const hasB2B = !!membership;

  // Auto-redirect if only one option available and no explicit enable request
  if (!requestEnable && hasB2C && !hasB2B) return <Navigate to="/app/dashboard" replace />;
  if (!requestEnable && hasB2B && !hasB2C) return <Navigate to="/retail/app/dashboard" replace />;

  async function enableB2C() {
    setEnabling(true);
    const { error } = await supabase.rpc("enable_b2c_for_self");
    if (error) {
      toast({ title: "Aktivierung fehlgeschlagen", description: error.message, variant: "destructive" });
      setEnabling(false);
      return;
    }
    await refreshProfile();
    setEnabling(false);
    nav("/app/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-semibold mb-2 text-center">Bereich wählen</h1>
        <p className="text-center text-muted-foreground mb-10">
          Deine E-Mail ist für mehrere Pallanx-Bereiche freigeschaltet.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => hasB2C ? nav("/app/dashboard") : enableB2C()}
            disabled={enabling}
            className="text-left rounded-xl border bg-card p-8 hover:border-primary transition-colors disabled:opacity-60"
          >
            <User className="w-8 h-8 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Pallanx (Privat)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Honorare, Verträge, Rabattdruck — dein persönlicher Verhandlungs-Copilot.
            </p>
            {hasB2C ? (
              <span className="text-sm text-primary">Öffnen →</span>
            ) : (
              <span className="text-sm text-primary inline-flex items-center gap-2">
                {enabling && <Loader2 className="w-3 h-3 animate-spin" />}
                Privat-Zugang aktivieren →
              </span>
            )}
          </button>
          <button
            onClick={() => hasB2B && nav("/retail/app/dashboard")}
            disabled={!hasB2B}
            className="text-left rounded-xl border bg-card p-8 hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Shield className="w-8 h-8 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Retail Shield (Business)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Reklamationsmanagement für dein Team und deinen Betrieb.
            </p>
            {hasB2B ? (
              <span className="text-sm text-primary">Öffnen →</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Keine Business-Mitgliedschaft. <Link to="/retail/register" className="text-primary hover:underline">Konto erstellen</Link>
              </span>
            )}
          </button>
        </div>
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); nav("/login"); }}>
            Abmelden
          </Button>
        </div>
      </div>
    </div>
  );
}