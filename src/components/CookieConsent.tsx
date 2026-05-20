import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "pallanx-cookie-consent";

interface Consent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (consent: Consent) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // ignore
    }
    setVisible(false);
    setSettingsOpen(false);
  };

  const acceptAll = () =>
    save({ necessary: true, analytics: true, marketing: true, timestamp: new Date().toISOString() });
  const onlyNecessary = () =>
    save({ necessary: true, analytics: false, marketing: false, timestamp: new Date().toISOString() });
  const saveSettings = () =>
    save({ necessary: true, analytics, marketing, timestamp: new Date().toISOString() });

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-background/95 backdrop-blur shadow-2xl">
        <div className="container py-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 text-sm text-muted-foreground">
            <p className="text-foreground font-medium mb-1">Cookies & Datenschutz</p>
            <p>
              Wir verwenden Cookies und ähnliche Technologien, um diese Website bereitzustellen, zu sichern
              und zu verbessern. Details in unserer{" "}
              <Link to="/datenschutz" className="underline hover:text-primary">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              Einstellungen
            </Button>
            <Button variant="outline" size="sm" onClick={onlyNecessary}>
              Nur notwendige
            </Button>
            <Button variant="gold-outline" size="sm" onClick={acceptAll}>
              Alle akzeptieren
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie-Einstellungen</DialogTitle>
            <DialogDescription>
              Wählen Sie, welche Kategorien Sie zulassen möchten. Notwendige Cookies sind für den Betrieb
              der Seite erforderlich.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Notwendig</p>
                <p className="text-sm text-muted-foreground">
                  Authentifizierung, Sicherheit, Lastverteilung. Immer aktiv.
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Analyse</p>
                <p className="text-sm text-muted-foreground">
                  Anonymisierte Nutzungsstatistiken zur Verbesserung der Website.
                </p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Marketing</p>
                <p className="text-sm text-muted-foreground">
                  Personalisierte Inhalte und Reichweitenmessung externer Anbieter.
                </p>
              </div>
              <Switch checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onlyNecessary}>
              Nur notwendige
            </Button>
            <Button variant="gold-outline" onClick={saveSettings}>
              Auswahl speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};