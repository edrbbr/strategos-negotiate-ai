import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Wand2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface Settings {
  chat_provider: string;
  chat_model: string;
}

/**
 * Admin-only Floating-Badge: zeigt den aktiven Chat-Provider und bietet einen
 * Ein-Klick-Connectivity-Test. Für alle anderen Nutzer komplett unsichtbar.
 */
export const AdminProviderBadge = () => {
  const { data: role } = useUserRole();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (!role?.isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("ai_provider_settings")
        .select("chat_provider, chat_model")
        .eq("id", "global")
        .maybeSingle();
      if (data) setSettings(data as Settings);
    })();
  }, [role?.isAdmin]);

  if (!role?.isAdmin || !settings) return null;

  const isKimi = settings.chat_provider === "kimi";

  const handlePing = async () => {
    setPinging(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-provider-ping", {
        body: { provider: settings.chat_provider, model: settings.chat_model },
      });
      if (error) {
        toast.error(`Test fehlgeschlagen: ${error.message}`);
      } else if (data?.ok) {
        toast.success(
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {settings.chat_model} OK · {data.latency_ms} ms
          </span>,
        );
      } else {
        toast.error(
          <span className="inline-flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> {data?.error ?? "Unbekannter Fehler"}
          </span>,
        );
      }
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur text-xs font-mono-label">
      <Wand2 className={`w-3.5 h-3.5 ${isKimi ? "text-amber-500" : "text-primary"}`} />
      <span className="text-muted-foreground">AI:</span>
      <span className={isKimi ? "text-amber-500 font-medium" : "text-foreground font-medium"}>
        {isKimi ? "Kimi" : "Claude"}
      </span>
      <span className="text-muted-foreground/60">·</span>
      <button
        type="button"
        onClick={handlePing}
        disabled={pinging}
        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {pinging ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
      </button>
      <span className="text-muted-foreground/60">·</span>
      <Link to="/admin/ai-provider" className="text-muted-foreground hover:text-foreground">
        Einstellen
      </Link>
    </div>
  );
};