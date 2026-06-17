## Vier kleine Fixes

### 1. Mobile: Link zu Geschäftskunden auf Startseite
`src/components/PublicHeader.tsx` — die Nav ist `hidden md:flex`, deshalb fehlt mobil alles inkl. „Geschäftskunden". Zusätzlich einen **mobil sichtbaren** Link einbauen: kleines `md:hidden` „Geschäftskunden →" zwischen Logo und Login-Button, in derselben uppercase-Optik.

### 2. Apple SSO
Über `configure_social_auth` mit `providers: ["google","apple"]` aktivieren (Google bleibt erhalten). Dann in **`Login.tsx`**, **`Register.tsx`** und **`RetailLogin.tsx`** einen zweiten Button „Mit Apple fortfahren" ergänzen, der `lovable.auth.signInWithOAuth("apple", { redirect_uri: ... })` aufruft — gleiche Fehler/Redirect-Logik wie der bestehende Google-Handler.

### 3. „Rollen-Verwalter" entfernen
`src/pages/retail/app/RetailSettings.tsx` — den `<RoleAdminsSection>`-Block am Ende rausnehmen (Zeilen 67–69). Import von `RoleAdminsSection` ebenfalls entfernen. Die Komponentendatei selbst bleibt liegen (kein Risiko).

### 4. B2B: Navigation zurück zur Home
`src/components/retail/RetailLayout.tsx` — im Sidebar-Header (Desktop) und im Mobile-Top-Bar das `Shield + Retail Shield`-Logo zu einem `<Link to="/">` machen, plus einen expliziten „Zur Pallanx-Startseite"-Eintrag unten in der Sidebar (über dem Abmelden-Button), Icon `Home`. So findet ein eingeloggter B2B-Nutzer immer zurück auf `/`.

## Nicht im Scope
- Apple Developer-Credentials (BYOC) — Lovable-managed Apple Auth funktioniert out-of-the-box.
- Komplett-Redesign des Mobile-Headers.