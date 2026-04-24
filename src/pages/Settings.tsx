import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SettingsSideNav } from "@/components/settings/SettingsSideNav";
import { MandateBlock } from "@/components/settings/MandateBlock";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success("Änderungen gespeichert.");
    refreshProfile();
  };

  const onCancel = () => {
    if (profile) setFullName(profile.full_name ?? "");
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="grid lg:grid-cols-[260px_1fr] gap-12">
        <SettingsSideNav active="profile" />

        <section>
          <div className="flex items-start justify-between mb-12 flex-wrap gap-4">
            <h1 className="font-serif text-4xl md:text-5xl">Profileinstellungen</h1>
            <span className="font-mono-label text-muted-foreground">
              Identität verifiziert
            </span>
          </div>

          <div className="space-y-8 mb-12 max-w-2xl">
            <div>
              <label className="font-mono-label text-muted-foreground">Vollständiger Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-sans text-lg focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono-label text-muted-foreground">E-Mail-Adresse (Readonly)</label>
              <input
                readOnly
                value={user?.email ?? ""}
                className="w-full bg-transparent border-0 border-b border-border/40 py-2 font-sans text-lg text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-6 mb-16">
            <button onClick={onCancel} className="font-mono-label text-muted-foreground hover:text-foreground">
              Abbrechen
            </button>
            <Button variant="gold-outline" size="lg" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Änderungen speichern
            </Button>
          </div>

          <div className="border-t border-border/40 pt-10 mb-12 max-w-2xl">
            <h2 className="font-serif text-2xl mb-2">Erscheinungsbild</h2>
            <p className="font-sans text-sm text-muted-foreground mb-6 leading-relaxed">
              Hell wirkt klassisch wie unsere Einladungen. Dunkel betont das Imperiale.
              Ihre Wahl wird in Ihrem Profil gespeichert und auf allen Geräten übernommen.
            </p>
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="font-mono-label text-muted-foreground mb-1">Aktuelles Theme</p>
                <p className="font-serif text-lg">
                  {theme === "dark" ? "Dunkelmodus" : "Hellmodus"}
                </p>
              </div>
              <ThemeToggle variant="full" />
            </div>
          </div>

          <MandateBlock />

          <div className="mt-8 text-right">
            <Link
              to="/app/billing"
              className="font-mono-label text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              Vollständige Abrechnung →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
