## Ziel

Ein Auth-User pro E-Mail. Zugang zu B2C (`/app/*`) und B2B (`/retail/app/*`) wird strikt über **Kontext-Berechtigungen** geregelt, nicht über das Login selbst. Wer beides nutzt, sieht beim Login einen Kontext-Switcher.

## Regeln (verbindlich)

| Nutzer hat… | Darf `/app/*` (B2C) | Darf `/retail/app/*` (B2B) |
|---|---|---|
| nur B2C-Profil mit aktivem Plan | Ja | Nein → Redirect `/retail/login` |
| nur aktive `business_users`-Mitgliedschaft | Nein → Redirect `/retail/app/dashboard` | Ja |
| beides | Ja | Ja, Kontext-Switcher nach Login |

Heute scheitert das, weil `ProtectedRoute` nur `isAuthenticated` prüft. Ein B2B-Nutzer hat aber durch `handle_new_user` automatisch eine `profiles`-Zeile mit `plan_id='free'` — also gilt er fälschlich als gültiger B2C-User.

## Definition „aktiver B2C-Nutzer"

Wir führen eine explizite Flag ein statt über „free plan" zu raten:

- Spalte `profiles.b2c_enabled boolean not null default false`.
- Wird auf `true` gesetzt, wenn der User über `/register` (B2C-Flow) signt **oder** im B2C-Login/Dashboard B2C aktiv nutzt (siehe Self-Service unten).
- `handle_new_user` bleibt wie heute (Profile anlegen), setzt aber `b2c_enabled = (raw_user_meta_data->>'signup_context') = 'b2c'`. Der B2C-`Register`-Flow setzt diesen Meta-Wert; der B2B-`RetailRegister` setzt ihn nicht.

Bestehende Nutzer: einmalige Backfill-Migration — `b2c_enabled = true` für alle Profile, die kein aktives `business_users` haben (damit kein existierender Kunde rausfliegt). Reine B2B-Accounts (existieren in `business_users`, kein nennenswerter B2C-Use) → `b2c_enabled = false`.

## Frontend-Änderungen

### 1. `ProtectedRoute` (B2C-Wächter)
- Zusätzlich `profile.b2c_enabled` prüfen.
- Falls `false` und User hat `business_users`-Mitgliedschaft → `Navigate` zu `/retail/app/dashboard`.
- Falls `false` und keine B2B-Mitgliedschaft → Self-Service-Hinweis („B2C-Zugang aktivieren") + Button, der `b2c_enabled` per RPC auf `true` setzt (RLS: nur eigener Profile-Row).

### 2. `RetailProtectedRoute` bleibt wie heute (prüft `business_users` — schon korrekt).

### 3. Kontext-Switcher
- Neue Seite `/select-context`. Zeigt zwei Karten: „Pallanx (Privat)" und „Retail Shield (Business)" — nur die mit Berechtigung sind klickbar.
- Login-Flows (`Login.tsx`, `RetailLogin.tsx`) routen nach erfolgreichem Sign-in:
  - hat beides → `/select-context` (außer `returnUrl` ist gesetzt und passt zum Kontext).
  - hat nur B2C → `/app/dashboard`.
  - hat nur B2B → `/retail/app/dashboard`.
- Globaler Header bekommt einen kleinen „Zu Retail Shield wechseln"/„Zu Pallanx wechseln"-Link, wenn beide Kontexte verfügbar sind.

### 4. `AuthContext`
- `profile.b2c_enabled` mitladen (Select erweitern).
- Kleine Helper `hasB2C` / `hasB2B` (letzteres via `useBusinessMembership`, schon vorhanden).

## Backend-Änderungen

1. **Migration**:
   - `alter table public.profiles add column b2c_enabled boolean not null default false;`
   - Backfill wie oben.
   - `handle_new_user` ergänzen, dass `b2c_enabled` aus `raw_user_meta_data->>'signup_context'` gelesen wird.
2. **RPC `enable_b2c_for_self()`** (SECURITY DEFINER, setzt `b2c_enabled = true` für `auth.uid()`), damit der Self-Service-Button keine direkte Profile-Update-Policy braucht.
3. `RetailRegister`/`Register` so anpassen, dass `signInWithEmail`/`signUp` den richtigen `signup_context` in den User-Metadaten mitsendet.

## Was sich am Login NICHT ändert

- Weiterhin ein Auth-System, eine Passwort-DB, ein Google-OAuth.
- Gleiche E-Mail = ein Account = ein Passwort. Keine zwei parallelen Identitäten.

## Warum nicht zwei Auth-Systeme

Zwei Supabase-Projekte würden bedeuten: doppelte User-Verwaltung, doppelte OAuth-Configs, kein gemeinsames Passwort, kein SSO zwischen beiden Welten. Das ist der Standardweg nur bei harten regulatorischen Trennungspflichten (z. B. Bank/Privat). Für dein Setup (gleicher Anbieter, zwei Produktlinien) ist „eine Identität, zwei Kontexte" Industriestandard (Slack-Workspaces, Notion-Teams, Linear-Workspaces folgen demselben Muster).

## Validierung nach Build

1. `fsm1453@protonmail.com` (B2B-only) → Login auf `/login` → wird auf `/retail/app/dashboard` umgeleitet, `/app/dashboard` nicht erreichbar.
2. Reiner B2C-Test-User → `/retail/app/*` nicht erreichbar.
3. Neuer User registriert sich über `/register` → landet in B2C, kein B2B-Zugang.
4. Neuer User über `/retail/register` → landet in B2B, kein B2C.
5. Bestehender B2C-User aktiviert zusätzlich B2B (Einladung) → nach Login Kontext-Switcher.

## Nicht im Scope

- Trennung der Bezahl-Abos (B2C-Plan und B2B-Plan bleiben unabhängig wie heute).
- UI-Redesign der Login-Seiten.
- Migration bestehender E-Mail-Templates.