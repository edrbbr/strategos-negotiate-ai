import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/\d/.test(password)) {
      toast.error("Mind. 8 Zeichen und eine Zahl erforderlich.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Passwort aktualisiert.");
    navigate("/app/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/40">
        <Logo />
        <blockquote className="font-serif italic text-3xl leading-tight max-w-md">
          "Souveränität wird nicht geschenkt. Sie wird neu definiert — bei jedem Schlüsselwechsel."
        </blockquote>
        <span className="font-mono-label text-muted-foreground">◆ Key Rotation Protocol</span>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-5xl mb-3">Neues Passwort</h1>
          <p className="font-mono-label text-primary mb-10">
            Identitäts-Schlüssel rotieren
          </p>

          <form onSubmit={onSubmit} className="space-y-8">
            <div>
              <label className="font-mono-label text-muted-foreground mb-2 block">
                Neues Passwort
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg tracking-widest placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="font-mono-label text-muted-foreground mb-2 block">
                Bestätigen
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary focus:outline-none py-2 font-serif text-lg tracking-widest placeholder:text-muted-foreground/40"
              />
            </div>

            <Button
              type="submit"
              variant="gold-outline"
              size="xl"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Wird aktualisiert…
                </>
              ) : (
                "Passwort speichern"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
