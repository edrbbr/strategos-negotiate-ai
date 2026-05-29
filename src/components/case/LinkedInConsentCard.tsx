import { useEffect, useState } from "react";
import { Linkedin, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

/**
 * Shown on a completed case once. User opts in/out of letting PALLANX
 * use their case (fully anonymized) for LinkedIn content. Result is
 * recorded in `linkedin_pool` — admins curate from there.
 */
export function LinkedInConsentCard({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "show" | "saved" | "hidden">("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("linkedin_pool")
        .select("id, user_consent")
        .eq("case_id", caseId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setStatus("hidden"); // already answered
      } else {
        setStatus("show");
        track("linkedin_consent_shown", { case_id: caseId });
      }
    })();
    return () => { cancelled = true; };
  }, [caseId, user]);

  const decide = async (consent: boolean) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("linkedin_pool").insert({
      case_id: caseId,
      user_id: user.id,
      user_consent: consent,
      consent_at: new Date().toISOString(),
      status: consent ? "pending" : "rejected",
    });
    setSaving(false);
    if (error) {
      toast.error(`Konnte nicht gespeichert werden: ${error.message}`);
      return;
    }
    track(consent ? "linkedin_consent_accepted" : "linkedin_consent_declined", { case_id: caseId });
    setStatus("saved");
    if (consent) {
      toast.success("Danke! Wir melden uns vor jeder Veröffentlichung.");
    }
  };

  if (status === "loading" || status === "hidden") return null;

  if (status === "saved") {
    return (
      <div className="border border-border/30 bg-card rounded-sm px-5 py-4 flex items-center gap-3 mt-6 animate-fade-in">
        <Check className="w-4 h-4 text-primary" />
        <p className="font-mono-label text-muted-foreground">Eingabe gespeichert. Danke.</p>
      </div>
    );
  }

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-sm p-6 mt-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
          <Linkedin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-mono-label text-primary mb-2">◆ Dieser Fall könnte anderen helfen</p>
          <p className="font-serif text-base leading-relaxed text-foreground/90 mb-4">
            Dürfen wir deine Verhandlung <strong>vollständig anonymisiert</strong> als
            LinkedIn-Story verwenden? Namen, Zahlen und Branchen werden ersetzt. Du
            siehst den finalen Post vor jeder Veröffentlichung.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => decide(true)}
              disabled={saving}
              className="font-mono-label text-primary border border-primary/60 hover:bg-primary/10 px-4 py-2 rounded-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Ja, anonymisiert verwenden
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={saving}
              className="font-mono-label text-muted-foreground hover:text-foreground px-4 py-2 rounded-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Nein danke
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}