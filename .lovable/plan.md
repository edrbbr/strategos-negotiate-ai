
# BLOCK 1 — Technisches SEO-Fundament + Tracking-DB

Nur die unten gelisteten Änderungen. Kein Content, kein Plausible, kein aktives gtag, keine Branchen-Seiten.

## 1. Helmet sauber aktivieren
- `react-helmet-async` ist bereits installiert und `HelmetProvider` ist bereits in `src/main.tsx` aktiv → ✅ nichts zu tun, kurz verifizieren.

## 2. Canonical & og:url aus `index.html` entfernen
- `<link rel="canonical">` und `<meta property="og:url">` aus `index.html` löschen.
- Sitewide `og:title/description/image` bleiben als Fallback für JS-lose Social-Crawler.
- Per-Route Canonical/og:url werden über die bestehende `<Seo>`-Komponente gesetzt; ich ergänze `<Seo>` auf den öffentlichen Routen, denen er noch fehlt (`/preise`, `/login`, `/register`, `/datenschutz`, `/retail/login`, `/retail/register`).

## 3. `<html lang>` dynamisch
- Neuer Hook `useHtmlLang(lang = "de")`, aufgerufen in `App.tsx` (Default `de`). Setzt `document.documentElement.lang`. Vorbereitet für spätere `de-AT`/`de-CH`-Routen, ohne sie heute zu schalten.

## 4. 404 = noindex
- `NotFound.tsx`: `<Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>`.

## 5. Sitemap-Generator
- Neue Datei `scripts/generate-sitemap.ts` (Template aus den Knowledge-Files), `BASE_URL = "https://pallanx.com"`.
- Routen-Liste (nur was existiert): `/`, `/preise`, `/login`, `/register`, `/retail`, `/retail/login`, `/retail/register`, `/datenschutz`.
- `/impressum` existiert **nicht** als Route → bewusst weggelassen, kommt rein wenn die Seite gebaut ist.
- `package.json` Hooks: `"predev": "bunx tsx scripts/generate-sitemap.ts"`, `"prebuild": "bunx tsx scripts/generate-sitemap.ts"`.
- Bestehende statische `public/sitemap.xml` wird vom Generator-Output überschrieben.

## 6. `robots.txt` erweitern
- Bestehende `User-agent:`-Blöcke beibehalten.
- Im `User-agent: *`-Block hinzufügen:
  ```
  Disallow: /admin
  Disallow: /app
  Disallow: /retail/app
  Disallow: /case
  Disallow: /passwort-neu
  Disallow: /passwort-vergessen
  Disallow: /check-email
  Disallow: /unsubscribe
  ```
- `Sitemap: https://pallanx.com/sitemap.xml` ist bereits vorhanden → bleibt.

Hinweis: dein Plan nennt `/reset-password`, die tatsächliche Route heißt `/passwort-neu` (+ `/passwort-vergessen`). Ich blockiere die tatsächlichen Pfade.

## 7. UTM-Capture-Hook
- Neue Datei `src/lib/utm.ts`:
  - `captureUtmFromUrl()` — liest `utm_source/medium/campaign/term/content` + `gclid` + `fbclid` aus `window.location`, schreibt sie mit 30-Tage-Ablauf in `localStorage` unter `pallanx_utm`.
  - `getStoredUtm()` — gibt das gespeicherte Objekt zurück oder `{}` wenn abgelaufen.
- Neuer Hook `src/hooks/useUtmCapture.ts` → ruft `captureUtmFromUrl()` einmal auf Mount.
- Aufruf in `src/App.tsx` einmal innerhalb des Routers (z. B. in einer kleinen `RootEffects`-Komponente).
- `RetailLanding` (Lead-Formular) und `Register`/`RetailRegister` hängen `getStoredUtm()` an ihren Submit-Payload an.

## 8. DB-Erweiterung + serverseitige Conversion-Events

### 8a. Migration
- `b2b_leads`: Spalten `utm_source text`, `utm_medium text`, `utm_campaign text`, `utm_term text`, `utm_content text`, `gclid text`, `fbclid text`, `referrer text` ergänzen.
- `analytics_events` hat bereits `properties jsonb` + `path`. Wir ergänzen `utm` separat NICHT — UTM wandert in `properties`. Spalte `user_agent text` ergänzen (für serverseitige Events ohne JS).
- Neue Tabelle `conversion_events` (server-side, append-only, getrennt von Client-`analytics_events`):
  - `id uuid pk`, `event_name text not null` (`b2b_lead` | `register` | `checkout_success`), `user_id uuid null`, `email text null`, `business_account_id uuid null`, `properties jsonb default '{}'`, `utm jsonb default '{}'`, `created_at timestamptz default now()`.
  - RLS: nur Admins lesen (`has_role(auth.uid(),'admin')`), Insert nur per Service-Role.
  - GRANTs: `service_role` ALL, `authenticated` SELECT (RLS gated).

### 8b. Edge Functions
- `b2b-lead-submit/index.ts`: nimmt zusätzlich `utm` (Objekt) + `referrer` aus dem Body, speichert sie in `b2b_leads`, schreibt parallel ein `conversion_events`-Insert (`event_name='b2b_lead'`).
- `b2b-register-account/index.ts`: nach erfolgreicher Account-Provisionierung ein `conversion_events`-Insert (`event_name='register'`, `properties.flow='b2b'`). UTM kommt aus dem Body (Frontend hängt an).
- `payments-webhook/index.ts`: bei `checkout.session.completed` zusätzlich `conversion_events`-Insert (`event_name='checkout_success'`, `properties.plan_id, billing_cycle, amount_cents, currency`). UTM aus Stripe-Session-Metadata wenn vorhanden.
- `create-checkout/index.ts`: nimmt `utm` im Body entgegen und packt es in `session.metadata`, damit der Webhook es zurücklesen kann.

### 8c. Frontend
- `Register.tsx`, `RetailRegister.tsx` und `RetailLanding.tsx` hängen `getStoredUtm()` an die Edge-Function-Aufrufe.
- `useStripeCheckout.tsx` hängt `getStoredUtm()` an den `create-checkout`-Call.

## 9. gtag-Vorbereitung (inaktiv)
- `.env` bekommt keinen Eintrag (Lovable-managed). Stattdessen Konstante `VITE_ENABLE_GTAG` lesen über `import.meta.env.VITE_ENABLE_GTAG === "true"`.
- Neue Datei `src/lib/gtag.ts` mit `initGtag()` und `trackGtagConversion(label, value?)`, geguarded durch das Flag. Wird heute nirgendwo aufgerufen, ist aber bereit für später.
- `index.html` bekommt **keinen** gtag-Snippet — wird nachgerüstet, wenn Ads-ID da ist.

## 10. Was NICHT in Block 1 gebaut wird
- Keine `/retail/moebelhandel`, `/retail/kfz-werkstatt`, `/retail/elektronikhandel`.
- Kein `/magazin`, keine `magazin_articles`-Tabelle.
- Kein Plausible-Snippet.
- Kein scharfer gtag.
- Keine Schema.org-Erweiterungen für `/retail` oder `/preise`.

---

## Technische Details (für späteres Audit)

**Reihenfolge bei Umsetzung** (wegen abhängiger Migration):
1. Migration für `b2b_leads`-Spalten + `conversion_events`-Tabelle → Approval & Run.
2. Alle Frontend-Änderungen + Edge-Function-Änderungen + Sitemap-Generator + robots.txt + `index.html`-Bereinigung in einem Build.
3. Edge Functions werden automatisch deployed.

**Risiken / Hinweise:**
- Sitemap-Generator-Hook (`predev`) löst beim ersten Lauf einen kurzen Build-Spike aus.
- `conversion_events` ist intentional **append-only** und enthält nur nicht-PII-Aggregat-Properties; E-Mails werden gehasht wenn nötig (vorerst plain, da intern).
- UTM-Cookie/-localStorage ist technisch notwendig (Funnel-Zuordnung) → fällt unter berechtigtes Interesse, kein Consent-Banner-Eintrag nötig solange nichts an Dritte geht.

Nach Build 1: ich melde mich mit Test-Checkliste (Sitemap-URL, robots-Test, Lead-Submit mit `?utm_source=test`-Param, DB-Eintrag in `conversion_events`). Dann freigibst du Block 2.
