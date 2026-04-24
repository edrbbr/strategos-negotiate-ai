

# PALLANX-Rebrand & Großes Feature-Update

## Phase 1 — Rebrand (Strategos → PALLANX)

### 1.1 Logo & Marke
- Neues Logo aus `user-uploads://PALLANX.png` nach `src/assets/pallanx-logo.png` kopieren.
- `src/components/Logo.tsx`: Bild-Quelle tauschen, Wortmarke „STRATEGOS" → „PALLANX" (Gold-Serif-Italic bleibt). Subtitle-Variante anpassen.
- Altes `src/assets/strategos-logo.svg` löschen, alle Imports auf neue Datei umbiegen (`UpgradeModal.tsx`).

### 1.2 Text-Replacements (komplettes Repo durchsuchen)
- Alle UI-Strings „Strategos" / „STRATEGOS" → „PALLANX" / „Pallanx" (ohne `supabase/functions/strategos-*` — Funktionsnamen bleiben aus Kompatibilität).
- Betroffen: `index.html` (Title, Meta, OG, Twitter), `Landing.tsx`, `Register.tsx`, `Pricing.tsx`, `AppLayout.tsx`, Footer-Copyright.
- Alle „© 2024" → „© 2026".
- Footer-Tagline „Strategos Internal // V.2.0.4-Gold" → „PALLANX Internal // V.3.0.0-Imperial".

### 1.3 Wording „Fall/Fälle" → „Dossier/Dossiers"
- Repo-weiter Sweep: `Neuer Fall` → `Neues Dossier`, `Aktive Fälle` → `Aktive Dossiers`, `Fälle` → `Dossiers`, `Fall-Analyse` → `Dossier-Analyse`, etc.
- Betroffen: `AppSidebar.tsx`, `CaseCard.tsx`, `CaseChatView.tsx`, `Dashboard.tsx`, `CaseDetail.tsx`, `Settings.tsx`, `UpgradeModal.tsx`, Edge-Function User-Messages (Strings).
- DB-Spalten / Tabellen (`cases`, `case_versions`, `cases_used`) **bleiben** — nur UI-Wording ändert sich.

---

## Phase 2 — Pricing-Modell-Umstellung (Pro auf 20 Dossiers, Extra-Credits)

### 2.1 DB-Migrationen
- `plans`: `pro` bekommt `case_limit = 20`, `case_limit_type = 'monthly'` (resettet pro Abrechnungsperiode). `elite` bleibt unlimited.
- Neue Spalten in `profiles`:
  - `extra_credits int NOT NULL DEFAULT 0` — gekaufte Zusatz-Dossiers
  - `cases_period_start timestamptz` — wann die aktuelle Zähler-Periode begann (für monatlichen Reset)
- Neue Tabelle `extra_credit_purchases`: `id, user_id, quantity, amount_cents, stripe_session_id, status, expires_at, created_at` — RLS: User sieht nur eigene; Service-Role schreibt.
- DB-Funktion `consume_dossier(p_user_id)`: zieht zuerst aus `cases_used` bis zum Limit, dann aus `extra_credits`. Atomar, transaktional. Wird von `strategos-ai-router` und `strategos-refinement` aufgerufen statt heutigem `cases_used + 1`.
- Trigger auf `subscriptions` erweitern: bei `current_period_start`-Wechsel `cases_used = 0`, `extra_credits = 0` (Verfall mit Abo-Periode).

### 2.2 Stripe-Setup
- Neues Stripe-Produkt `extra_dossier` mit Preis `extra_dossier_unit` à **10 EUR**, `quantity_min: 1, quantity_max: 10`.
- Neue Edge-Function `create-extra-dossier-checkout`: Embedded-Checkout für 1–10 Stück. `verify_jwt = false`, JWT in Code geprüft.
- `payments-webhook` erweitern: bei `checkout.session.completed` mit `mode: payment` und `metadata.purpose: 'extra_dossiers'` → `extra_credit_purchases` Row schreiben + `profiles.extra_credits += quantity` + `expires_at = subscription.current_period_end`.

### 2.3 Limit-Enforcement im Code
- `strategos-ai-router/index.ts` und `strategos-refinement/index.ts`: Limit-Check ersetzen durch RPC `consume_dossier`. Bei Ablehnung HTTP 403 mit `code: 'QUOTA_EXHAUSTED'` und `purchasable: true/false` (Pro: true, Free: false).
- Frontend reagiert: Pro-User sieht „Mandat vollständig genutzt"-Modal mit Mengenauswahl 1–10 → Checkout. Free-User sieht Upgrade-Modal.

### 2.4 UI-Anpassungen Pricing-Seite & Sidebar
- `Pricing.tsx`: Pro-Plan-Features um „20 Dossiers / Monat" + „Zusatz-Dossiers à 10 € nachkaufbar" ergänzen (datengetrieben aus `plan_features`).
- `AppSidebar.tsx`: Zähler zeigt `used + extra / limit + extra` mit visueller Trennung der gekauften Credits (kleines Plus-Badge).

---

## Phase 3 — Auth-Flow & Navigation

### 3.1 „START NEGOTIATION" → „Verhandlung starten"
- `Pricing.tsx` und `Landing.tsx` Header-Button: Text auf **„Verhandlung starten"**, Link von `/register` auf `/login`.

### 3.2 Eingeloggter Zustand auf Public-Seiten
- Header-Komponente in `Landing.tsx` und `Pricing.tsx`: Wenn `useAuth().user` vorhanden, statt „Login"-Link einen Button **„Mein Mandat"** (führt zu `/app/dashboard`). Der CTA-Button rechts wird zu **„Zurück zur Kommandozentrale"**.
- Avatar-Initial daneben (ohne Bild — siehe 6.1).

---

## Phase 4 — Settings-Seite umbauen

### 4.1 Profil-Seite (`/app/settings`)
- Titel „Profil-Parameter" → **„Profileinstellungen"**.
- **Entfernt**: Avatar-Block, Organisation-Feld, Toggle „Aggressive Verhandlungsführung", Toggle „Vertraulicher Archiv-Modus", komplette „Strategische Präferenzen"-Sektion, Side-Nav-Items „Benachrichtigungen" und „Sicherheit".
- DB-Spalten `aggressive_mode`, `archive_mode`, `organization`, `avatar_url` bleiben in DB (kein Risiko für Daten), werden nur nicht mehr im UI bearbeitet.
- Side-Nav wird funktionale Navigation: „Profileinstellungen" (`/app/settings`) | „Plan & Abrechnung" (`/app/billing`).

### 4.2 Dynamischer „Aktuelles Mandat"-Block
Ersetzt den bisherigen Plan-Block. Verhalten je nach `plan_id`:

- **Free**: „Sie haben noch **{N}** von 1 Dossier frei." → Großer Gold-CTA „Jetzt zu Pro upgraden — bevor Wettbewerber es tun." + 3 Pro-Mehrwerte als Bullets. Wenn N=0: dramatisch „Ihr Free-Kontingent ist aufgebraucht. Pro-Anwender verhandeln gerade weiter."
- **Pro**: Anzeige verbleibender Dossiers. Block „**Elite — Imperialer Zugang**" mit 3-4 exklusiven Mehrwerten (z.B. „Multi-Stage-KI-Pipeline", „Unbegrenzte Dossiers", „Priority Strategien-Engine"). Button **„Zugang anfragen"** → öffnet Anfrage-Modal (siehe Phase 5).
- **Elite**: Status-Bestätigung „Imperialer Zugang aktiv. Unbegrenzt." + Plan-Verwaltungs-Link.

### 4.3 Neue Route `/app/billing`
- Eigene Seite, in `App.tsx` als Protected Route registriert.
- Inhalt:
  - Aktueller Plan + Preis + Abrechnungszyklus + nächstes Abrechnungsdatum (`current_period_end` aus `subscriptions`)
  - Status-Badge (active / past_due / cancel_at_period_end)
  - Verbrauchsanzeige (Dossiers used / limit + extra)
  - Liste gekaufter Extra-Dossiers (aus `extra_credit_purchases`) mit Verfallsdatum
  - Button „Plan verwalten / kündigen" → öffnet Stripe-Kundenportal (`create-portal-session`, neuer Tab)
  - Falls Pro: Button „Zusatz-Dossiers kaufen" → öffnet Mengenauswahl-Modal → Checkout
- In `AppSidebar.tsx` Link „Plan & Abrechnung" hinzufügen.

---

## Phase 5 — Elite-Zugang-System

### 5.1 DB
- Neue Tabelle `elite_requests`:
  - `id, user_id, full_name, email, profession, primary_use_case, monthly_negotiation_volume, biggest_pain_point, status ('pending'|'sent'|'archived'), admin_token uuid, created_at, sent_at`
  - Felder bewusst minimal (5 Fragen) — analystisch verwertbar ohne zu nerven.
  - RLS: User sieht/insertet nur eigene; Admins sehen alle (via `has_role`).

### 5.2 User-Roles-Infrastruktur
- Neue Migration: Enum `app_role ('admin', 'user')`, Tabelle `user_roles`, Funktion `has_role(_user_id, _role)` SECURITY DEFINER (Best-Practice gemäß Lovable-Standard).
- Initial-INSERT: `('test-tregos-str@mail.com'-User-ID, 'admin')` — sowie deine echte E-Mail (frage ich ggf. nach, Default: derselbe Test-User wird Admin).

### 5.3 Anfrage-Flow (User-Seite)
- Im „Aktuelles Mandat"-Block (Pro-User): Button „Zugang anfragen" öffnet Modal mit:
  - Headline „Imperialer Zugang ist limitiert"
  - 4 exklusive Mehrwerte als Bullet-Liste (Marketing/Knappheit)
  - Form mit 5 Feldern: Name (vorausgefüllt), E-Mail (vorausgefüllt), Beruf/Position, Hauptanwendungsfall (Dropdown: Gehalt | M&A | Recht | Politik | Sonstiges), Verhandlungs-Volumen pro Monat (Dropdown: 1–5 / 6–20 / 20+), aktuelle größte Herausforderung (Textarea max 280 Zeichen).
  - Submit → INSERT in `elite_requests` (status='pending') + Edge-Function `notify-elite-request-admin` triggern (E-Mail an Admin im Hintergrund, ohne extra Bestätigung-Mail an User).
  - Erfolgs-Screen: „Ihre Anfrage wird geprüft. Bei Eignung erhalten Sie binnen 48 Stunden eine persönliche Einladung." (Kein zweiter Klick nötig.)

### 5.4 Admin-Seite `/admin`
- Neue Route, geschützt durch `has_role('admin')` (Redirect bei Nicht-Admin auf `/app/dashboard`).
- Liste aller `elite_requests` mit Status `pending`/`sent`. Tabelle: Datum, Name, E-Mail, Beruf, Use-Case, Volumen, Pain-Point, Status, Aktion.
- Aktion-Button **„Einladung senden"** → ruft `send-elite-invitation` Edge-Function auf. Setzt Status auf `sent`, `sent_at = now()`.
- Edge-Function rendert Lovable-Email-Template `elite-invitation` mit:
  - Persönliche Anrede
  - Mehrwerte-Liste (knapp & exklusiv)
  - Hinweis „Befristetes Angebot — 7 Tage"
  - Zwei CTAs als Buttons: „Elite Monatlich (XXX €)" und „Elite Jährlich (YYY €/Jahr — 2 Monate gratis)" — Links auf magische Checkout-URLs (`/app/billing?elite_offer=monthly|yearly`, dort wird automatisch Stripe geöffnet).

### 5.5 E-Mail-Infrastruktur (PALLANX-Domain)
- Lovable Emails einrichten (Domain `pallanx.com`, Subdomain `notify.pallanx.com` automatisch delegiert).
- Setup-Dialog wird aufgerufen → User trägt DNS ein → Bestätigung.
- Nach Domain-Bestätigung: `setup_email_infra` + Transactional-Templates scaffolden.
- Templates erstellen:
  - `elite-invitation.tsx` (User bekommt Einladung, Marketing-stark formuliert, brand-konform)
  - `admin-elite-request.tsx` (Admin bekommt Anfrage-Notification mit Link zu `/admin`)
- Edge-Functions `notify-elite-request-admin` (sendet an Admin) und `send-elite-invitation` (sendet an User) — beide nutzen `send-transactional-email`.

---

## Phase 6 — Typografie & Lesbarkeit (Dashboard / Case-Seiten)

### 6.1 Schriften beruhigen
- Aktuell wird `font-serif italic` exzessiv für Inhalte (Situations-Text, Strategie, Entwurf) verwendet — dadurch wirkt es schwer lesbar.
- Änderungen in `CaseChatView.tsx`, `CaseCard.tsx`, `CaseDetail.tsx`, `Dashboard.tsx`:
  - Inhalts-Text: `font-sans text-sm leading-relaxed text-foreground/90` (kein Italic, kein Serif für Fließtext).
  - Headlines (V0/V1/V2-Labels, Titel): bleiben in `font-mono-label` bzw. `font-serif` (aber nicht italic).
  - Größere `font-size` für Body-Content (`text-sm` → `text-[15px]` mit `leading-7` für Atmung).
- Buttons: Style wie „Pipeline starten" beibehalten (Größe, Schrift), aber `uppercase` und `tracking-[0.2em]` entfernen → normale Schreibweise. Globale Anpassung im Button-Variant `gold` und `gold-outline` in `button.tsx` — oder gezielt pro Button (sicherer, kein Auswirkungs-Schock).

### 6.2 Refinement-Chat-Eingabe (Mobile-Fix + Vergrößern)
In `CaseChatView.tsx`:
- **Layout-Trennung**: Send-Button raus aus dem inneren Textfeld-Container, eigene Zeile darunter (rechts ausgerichtet). Damit gewinnt Textarea volle Breite (besonders mobil).
- **Vergrößern-Icon** (`Maximize2` von lucide) oben rechts im Textfeld-Container. Klick öffnet `Dialog` (vorhanden in `ui/dialog`) mit großer Textarea (min-height 60vh), Senden-Button im Modal-Footer. Inhalt synchron mit Original-Textarea (gleicher State).
- Mobile: Textarea min-height auf `80px` (statt 44px) setzen.

---

## Phase 7 — Reihenfolge der Umsetzung

Damit nichts bricht, in dieser Reihenfolge:

1. **Rebrand** (Phase 1) — rein UI/Strings/Assets, kein Risiko.
2. **Settings entrümpeln + Typografie + Refinement-Chat-UI** (Phase 4.1, 6) — pures Frontend.
3. **DB-Migrationen** (Phase 2.1, 5.1, 5.2 — Roles) — Schema-Änderungen.
4. **Limit-Logik im Code** (Phase 2.3) — abhängig von 3.
5. **Stripe Extra-Credits** (Phase 2.2, 2.4) — abhängig von 3 + 4.
6. **Billing-Route** (Phase 4.3) — abhängig von 2 + 3.
7. **Auth-Flow-Updates** (Phase 3) — Standalone.
8. **Elite-Anfrage-System** (Phase 5.3, 5.4) — abhängig von 3 (Roles).
9. **E-Mails** (Phase 5.5) — als Letztes, da Domain-DNS-Setup erfordert.

## Dateien-Übersicht

| Datei | Änderung |
|---|---|
| `src/assets/pallanx-logo.png` | neu (kopiert aus Upload) |
| `src/assets/strategos-logo.svg` | gelöscht |
| `src/components/Logo.tsx` | Bild + Text auf PALLANX |
| `src/components/UpgradeModal.tsx` | Logo-Import, Wording |
| `src/components/AppLayout.tsx` | Footer-Tagline |
| `src/components/AppSidebar.tsx` | Wording, Billing-Link, extra_credits-Anzeige |
| `src/components/CaseCard.tsx` | Wording, Schriften |
| `src/components/CaseChatView.tsx` | Schriften + Send-Button-Trennung + Vergrößern-Modal |
| `src/components/PublicHeader.tsx` | neu (geteilter Header für Landing/Pricing mit Auth-State) |
| `src/components/EliteRequestModal.tsx` | neu |
| `src/components/ExtraDossierCheckoutModal.tsx` | neu (Mengenwahl 1–10) |
| `src/pages/Landing.tsx` | Wording, Header-Komponente, Footer 2026 |
| `src/pages/Pricing.tsx` | Wording, Header, CTA-Text/-Link, 2026, Pro-Features |
| `src/pages/Settings.tsx` | großer Umbau (entrümpelt, dynamischer Mandat-Block) |
| `src/pages/Billing.tsx` | neu (Plan-Verwaltung, Extra-Credits, Portal) |
| `src/pages/Admin.tsx` | neu (Elite-Anfragen-Liste) |
| `src/pages/CaseDetail.tsx` | Wording, Schriften |
| `src/pages/Dashboard.tsx` | Wording, Schriften |
| `src/App.tsx` | neue Routes `/app/billing`, `/admin` |
| `src/hooks/useEliteRequests.ts` | neu |
| `src/hooks/useExtraCredits.ts` | neu |
| `src/hooks/useUserRole.ts` | neu (`has_role`-Wrapper) |
| `index.html` | Title, Meta, OG → PALLANX |
| `supabase/migrations/...` | 4 neue Migrationen (siehe unten) |
| `supabase/functions/strategos-ai-router/index.ts` | Limit-Check via RPC |
| `supabase/functions/strategos-refinement/index.ts` | Limit-Check via RPC |
| `supabase/functions/payments-webhook/index.ts` | Extra-Dossiers-Handling |
| `supabase/functions/create-extra-dossier-checkout/index.ts` | neu |
| `supabase/functions/notify-elite-request-admin/index.ts` | neu |
| `supabase/functions/send-elite-invitation/index.ts` | neu |
| `supabase/functions/_shared/transactional-email-templates/elite-invitation.tsx` | neu |
| `supabase/functions/_shared/transactional-email-templates/admin-elite-request.tsx` | neu |
| `supabase/config.toml` | `verify_jwt=false` für neue Payment/Admin-Functions |

## Migrationen (4 Stück)

1. **Rebrand-Daten**: `UPDATE plans SET case_limit=20, case_limit_type='monthly' WHERE id='pro'`. `plan_features` für Pro: alte „unlimited"-Zeilen löschen, neue Zeilen „20 Dossiers/Monat", „Zusatz-Dossiers à 10 € nachkaufbar".
2. **Profile + Extra-Credits**: Spalten `extra_credits`, `cases_period_start` auf `profiles`; Tabelle `extra_credit_purchases` mit RLS; RPC `consume_dossier`; Trigger-Erweiterung für Reset.
3. **User-Roles**: Enum `app_role`, Tabelle `user_roles`, Funktion `has_role`, RLS-Policies. Initial-Daten via `insert`-Tool nach Migration (Test-User als Admin).
4. **Elite-Requests**: Tabelle `elite_requests` mit RLS-Policies (User: own; Admin: all via `has_role`).

## Nicht enthalten / spätere Iteration

- Notifications/Sicherheits-Settings (Sektion komplett entfernt — kann später wieder rein).
- Bestehende Daten in `aggressive_mode` / `archive_mode` / `organization` / `avatar_url` werden nicht migriert/gelöscht — nur UI versteckt.
- Echte Rechnungs-Historie (PDFs) auf Billing-Seite — Stripe-Portal übernimmt das.
- Gehörlosigkeit gegenüber laufenden Pro-Abos: Annahme „noch keine echten Pro-Kunden" — wird hartes 20er-Limit für alle.
- Mobile-spezifische Sidebar/Drawer-Optimierung über das Refinement-Textfeld hinaus.

