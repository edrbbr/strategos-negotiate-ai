## Ziel
Header-Buttons abhängig vom Login-Status anpassen, ThemeToggle als schwebenden Button platzieren, DSGVO-konformes Cookie-Banner + Datenschutzseite hinzufügen.

## Änderungen

### 1. `src/components/PublicHeader.tsx`
- **Eingeloggt:** „Verhandlung starten"-Button wird zum Button mit der E-Mail-Adresse des Users (`user.email`), führt weiter zu `/app/dashboard`. „Login"-Link wird ausgeblendet. Das bestehende „Mein Mandat"/„Zur Kommandozentrale" wird entfernt, damit nicht doppelt CTA erscheint (E-Mail-Button ersetzt sie).
- **Nicht eingeloggt:** „Login"-Link + „Verhandlung starten" bleiben wie bisher.
- `ThemeToggle` aus dem Header entfernen.

### 2. Schwebender ThemeToggle
- Neue Komponente `src/components/FloatingThemeToggle.tsx`: fixed unten rechts (`fixed bottom-6 right-6 z-50`), kreisrund, mit Schatten, `aria-label`, immer über dem Inhalt sichtbar.
- In `src/App.tsx` einmal global gerendert (innerhalb von `ThemeProvider`), damit es auf allen Routen erscheint.

### 3. Cookie-Banner (DSGVO-konform)
- Neue Komponente `src/components/CookieConsent.tsx`:
  - Erscheint nur, wenn `localStorage["pallanx-cookie-consent"]` nicht gesetzt ist.
  - Drei Buttons: **Alle akzeptieren**, **Nur notwendige**, **Einstellungen** (Dialog mit Toggles für „Notwendig" (pflicht, an), „Analyse", „Marketing").
  - Speichert JSON `{ necessary: true, analytics: bool, marketing: bool, timestamp }` in localStorage.
  - Link zur Datenschutzseite `/datenschutz`.
  - Fixed unten, über schwebendem ThemeToggle (z-index Hierarchie: Banner 60, Toggle 50).
- Global in `App.tsx` eingebunden.

### 4. Datenschutzseite
- Neue Seite `src/pages/Privacy.tsx` mit Route `/datenschutz` (+ Alias `/privacy`).
- Inhalt (deutsch, juristisch sauber strukturiert, aber als Vorlage gekennzeichnet — finale Prüfung durch Anwalt empfohlen):
  1. Verantwortlicher
  2. Erhobene Daten (Account: E-Mail, Name; Nutzungsdaten; Cookies)
  3. Zwecke und Rechtsgrundlagen (Art. 6 DSGVO)
  4. **Auftragsverarbeiter / Drittanbieter** mit Zweck und Datenarten:
     - **Lovable Cloud / Supabase** (EU) — Hosting, Auth, Datenbank, Edge Functions
     - **Lovable** (App-Hosting / Deployment)
     - **Stripe** (Zahlungsabwicklung, USA — SCC)
     - **Resend / E-Mail-Provider** (transaktionale E-Mails) — falls genutzt
     - **KI-Anbieter via Lovable AI Gateway** (Google Gemini, OpenAI GPT) — Verarbeitung von Verhandlungsinhalten
     - **Google Search Console** (Reichweitenmessung, Indexierung)
  5. Cookies & Tracking (Liste + Zweck + Speicherdauer)
  6. Speicherdauer
  7. Betroffenenrechte (Auskunft, Löschung, Widerspruch, Datenübertragbarkeit, Beschwerde Aufsichtsbehörde)
  8. Kontakt Datenschutz
- Footer-Link „Datenschutz" zur Seite (in bestehendem Footer falls vorhanden, sonst nur via Cookie-Banner verlinkt).

### 5. SEO
- `<Seo>` auf der Datenschutzseite (`/datenschutz`, `noindex` empfohlen? — bleibt indexierbar, da Pflichtinhalt).
- Eintrag in `public/sitemap.xml`.

## Offene Punkte / Annahmen
- **Verantwortlicher / Anschrift / Kontakt-E-Mail** für Datenschutz: Platzhalter `[Bitte ergänzen]` — bitte nach Implementierung füllen.
- **Analytics / Marketing-Tools** derzeit nicht aktiv erkannt — Toggles im Cookie-Banner werden trotzdem vorbereitet, aktuell ohne Effekt (zukunftssicher).
- Eigentlicher Cookie-Banner ist client-only ohne Backend-Logging der Consent-Entscheidung.

## Technische Details
- Keine DB-Migration nötig (Consent rein lokal).
- `useAuth()` liefert bereits `user` mit `email` — direkt nutzbar.
- ThemeToggle existiert bereits in `src/components/ThemeToggle.tsx` — Floating-Variante wrappt diesen.
