import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { utmForSubmit } from "@/lib/utm";

export default function RetailRegister() {
  const { signUpWithEmail, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [f, setF] = useState({ full_name: "", email: "", password: "", company_name: "", industry: "", store_count: "" });
  const [loading, setLoading] = useState(false);

  async function provisionTenant() {
    const { utm, referrer } = utmForSubmit();
    const { data, error } = await supabase.functions.invoke("b2b-register-account", {
      body: { company_name: f.company_name, industry: f.industry, store_count: f.store_count ? Number(f.store_count) : undefined, full_name: f.full_name, utm, referrer },
    });
    if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isAuthenticated) {
        const { error } = await signUpWithEmail(f.email, f.password, f.full_name);
        if (error) throw new Error(error);
        // wait briefly for session
        await new Promise((r) => setTimeout(r, 400));
      }
      await provisionTenant();
      toast({ title: "Willkommen!", description: "Ihr Retail-Shield-Konto wurde erstellt." });
      nav("/retail/app/dashboard");
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-6">
      <div className="w-full max-w-md">
        <Link to="/retail" className="flex items-center justify-center gap-2 mb-8">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-semibold">Pallanx Retail Shield</span>
        </Link>
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-1">Konto erstellen</h1>
          <p className="text-sm text-muted-foreground mb-6">Sie sind Leitung Ihres Unternehmens und richten den Zugang ein.</p>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Ihr Name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
            {!isAuthenticated && <>
              <div><Label>E-Mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
              <div><Label>Passwort</Label><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} /></div>
            </>}
            <div><Label>Firmenname</Label><Input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} required /></div>
            <div><Label>Branche</Label><Input value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} placeholder="z. B. Möbelhaus" /></div>
            <div><Label>Anzahl Filialen (optional)</Label><Input type="number" value={f.store_count} onChange={(e) => setF({ ...f, store_count: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Wird angelegt..." : "Konto erstellen"}</Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Bereits registriert? <Link to="/retail/login" className="text-primary hover:underline">Anmelden</Link>
          </div>
        </div>
      </div>
    </div>
  );
}