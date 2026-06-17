import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function RetailLogin() {
  const { signInWithEmail } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) { toast({ title: "Anmeldung fehlgeschlagen", description: error, variant: "destructive" }); return; }
    nav(params.get("returnUrl") || "/select-context");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-6">
      <div className="w-full max-w-md">
        <Link to="/retail" className="flex items-center justify-center gap-2 mb-8">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-semibold">Pallanx Retail Shield</span>
        </Link>
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-1">Anmelden</h1>
          <p className="text-sm text-muted-foreground mb-6">Business-Portal für Ihr Reklamationsteam.</p>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>E-Mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label>Passwort</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Anmeldung..." : "Anmelden"}</Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Noch kein Konto? <Link to="/retail/register" className="text-primary hover:underline">Registrieren</Link>
          </div>
        </div>
      </div>
    </div>
  );
}