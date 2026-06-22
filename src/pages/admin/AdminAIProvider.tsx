import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Provider = "anthropic" | "kimi";

interface Settings {
  chat_provider: Provider;
  chat_model: string;
  vision_provider: Provider;
  vision_model: string;
  updated_at?: string | null;
}

const DEFAULTS_BY_PROVIDER: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-5",
  kimi: "kimi-k2-0905-preview",
};

const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic Claude",
  kimi: "Moonshot Kimi",
};

const AdminAIProvider = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState<"chat" | "vision" | null>(null);
  const [settings, setSettings] = useState<Settings>({
    chat_provider: "anthropic",
    chat_model: DEFAULTS_BY_PROVIDER.anthropic,
    vision_provider: "anthropic",
    vision_model: DEFAULTS_BY_PROVIDER.anthropic,
  });
  const [lastPing, setLastPing] = useState<Record<string, { ok: boolean; latency_ms?: number; sample?: string; error?: string }>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ai_provider_settings")
        .select("*")
        .eq("id", "global")
        .maybeSingle();
      if (error) {
        toast.error("Konnte Einstellungen nicht laden.");
      } else if (data) {
        setSettings({
          chat_provider: (data.chat_provider as Provider) ?? "anthropic",
          chat_model: data.chat_model ?? DEFAULTS_BY_PROVIDER.anthropic,
          vision_provider: (data.vision_provider as Provider) ?? "anthropic",
          vision_model: data.vision_model ?? DEFAULTS_BY_PROVIDER.anthropic,
          updated_at: data.updated_at,
        });
      }
      setLoading(false);
    })();
  }, []);

  const onProviderChange = (kind: "chat" | "vision", value: Provider) => {
    setSettings((s) => ({
      ...s,
      [`${kind}_provider`]: value,
      [`${kind}_model`]: DEFAULTS_BY_PROVIDER[value],
    }) as Settings);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("ai_provider_settings")
      .update({
        chat_provider: settings.chat_provider,
        chat_model: settings.chat_model,
        vision_provider: settings.vision_provider,
        vision_model: settings.vision_model,
        updated_at: new Date().toISOString(),
        updated_by: user?.user?.id ?? null,
      })
      .eq("id", "global");
    setSaving(false);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success("KI-Provider aktualisiert. Die nächste Pipeline läuft mit der neuen Konfiguration.");
  };

  const handlePing = async (kind: "chat" | "vision") => {
    setPinging(kind);
    try {
      const provider = kind === "chat" ? settings.chat_provider : settings.vision_provider;
      const model = kind === "chat" ? settings.chat_model : settings.vision_model;
      const { data, error } = await supabase.functions.invoke("ai-provider-ping", {
        body: { provider, model },
      });
      if (error) {
        toast.error(`Test fehlgeschlagen: ${error.message}`);
        setLastPing((p) => ({ ...p, [kind]: { ok: false, error: error.message } }));
      } else {
        const result = data as { ok: boolean; latency_ms?: number; sample?: string; error?: string };
        setLastPing((p) => ({ ...p, [kind]: result }));
        if (result.ok) {
          toast.success(`Test OK (${result.latency_ms} ms)`);
        } else {
          toast.error(`Test fehlgeschlagen: ${result.error}`);
        }
      }
    } finally {
      setPinging(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 px-8 py-5 flex items-center justify-between">
        <Logo subtitle="AI-Provider" />
        <Link to="/admin" className="font-mono-label text-muted-foreground hover:text-foreground">← Imperial Console</Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12 space-y-8">
        <div>
          <p className="font-mono-label text-primary mb-2">Globaler Schalter</p>
          <h1 className="font-serif text-4xl mb-2">KI-Provider</h1>
          <p className="text-muted-foreground text-sm">
            Steuert für <strong>B2C + B2B (Retail Shield)</strong> simultan, welche KI die Pipelines nutzen.
            Änderungen wirken auf den nächsten Pipeline-Lauf (Single-Call, Multi-Stage, Refinement, Suggest, Upgrade Preview).
          </p>
        </div>

        <Card className="p-5 border-amber-500/30 bg-amber-500/5">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              Kimi liefert spürbar andere Tonalität als Claude — insbesondere im deutschen Verhandlungs-Kontext.
              Vor Live-Schaltung mit einem echten Fall testen. Rollback ist ein Klick.
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Lade…</div>
        ) : (
          <>
            <ProviderCard
              title="Chat-Provider"
              description="Alle text/JSON-Aufrufe: Analyse, Strategie, Entwurf, Refinement, Suggest, Upgrade Preview."
              kind="chat"
              provider={settings.chat_provider}
              model={settings.chat_model}
              onProviderChange={(v) => onProviderChange("chat", v)}
              onModelChange={(v) => setSettings((s) => ({ ...s, chat_model: v }))}
              onPing={() => handlePing("chat")}
              pinging={pinging === "chat"}
              lastPing={lastPing.chat}
            />
            <ProviderCard
              title="Vision / Anhänge-Provider"
              description="OCR + Inhaltsextraktion aus hochgeladenen Anhängen. PDFs fallen automatisch auf Anthropic zurück (Kimi unterstützt nur Bilder)."
              kind="vision"
              provider={settings.vision_provider}
              model={settings.vision_model}
              onProviderChange={(v) => onProviderChange("vision", v)}
              onModelChange={(v) => setSettings((s) => ({ ...s, vision_model: v }))}
              onPing={() => handlePing("vision")}
              pinging={pinging === "vision"}
              lastPing={lastPing.vision}
            />

            <div className="flex items-center justify-end gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </div>
            {settings.updated_at && (
              <p className="text-xs text-muted-foreground text-right">
                Zuletzt aktualisiert: {new Date(settings.updated_at).toLocaleString("de-DE")}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

interface ProviderCardProps {
  title: string;
  description: string;
  kind: "chat" | "vision";
  provider: Provider;
  model: string;
  onProviderChange: (v: Provider) => void;
  onModelChange: (v: string) => void;
  onPing: () => void;
  pinging: boolean;
  lastPing?: { ok: boolean; latency_ms?: number; sample?: string; error?: string };
}

const ProviderCard = ({ title, description, provider, model, onProviderChange, onModelChange, onPing, pinging, lastPing }: ProviderCardProps) => (
  <Card className="p-6 space-y-4">
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label className="font-mono-label text-xs">Provider</Label>
        <Select value={provider} onValueChange={(v) => onProviderChange(v as Provider)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">{PROVIDER_LABEL.anthropic}</SelectItem>
            <SelectItem value="kimi">{PROVIDER_LABEL.kimi}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="font-mono-label text-xs">Modell</Label>
        <Input value={model} onChange={(e) => onModelChange(e.target.value)} placeholder="Modell-ID" />
      </div>
    </div>
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" size="sm" onClick={onPing} disabled={pinging}>
        {pinging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Provider testen
      </Button>
      {lastPing && (
        <div className="flex items-center gap-2 text-xs">
          {lastPing.ok ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">{lastPing.latency_ms} ms · {lastPing.sample?.slice(0, 80)}…</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-destructive">{lastPing.error ?? "Fehler"}</span>
            </>
          )}
        </div>
      )}
    </div>
  </Card>
);

export default AdminAIProvider;