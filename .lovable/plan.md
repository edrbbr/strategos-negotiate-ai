## Ziel

Einen neuen Test-User-Account anlegen mit:
- **E-Mail:** `edrbbr@pallanx.com`
- **Passwort:** `EnBa3005@pallanx`
- **Plan:** Elite (mit allen Elite-Berechtigungen)

## Vorgehen

Da User-Anlage und Profil-/Plan-Zuweisung nicht über das Frontend lösbar sind, erfolgt das in **drei Schritten** direkt im Backend:

### 1. Auth-User anlegen
Über das Supabase Admin API (Edge-Function `supabase.auth.admin.createUser` mit Service-Role-Key):
- E-Mail: `edrbbr@pallanx.com`
- Passwort: `EnBa3005@pallanx`
- `email_confirm: true` → User kann sich sofort einloggen, keine Bestätigungsmail nötig
- `user_metadata.full_name`: `"Test Elite User"`

Der bestehende `handle_new_user`-Trigger erstellt automatisch einen Profil-Eintrag in `public.profiles` mit `plan_id = 'free'`.

### 2. Profil auf Elite-Plan upgraden
Per SQL-Update (Insert-Tool) auf `public.profiles`:
- `plan_id = 'elite'`
- `subscription_status = 'active'`
- `billing_cycle = 'yearly'` (passt zur Elite-Tier-Logik)
- `cases_used = 0`, `extra_credits = 0`, `refinements_used_period = 0`
- `cases_period_start = now()`, `refinements_period_start = now()`

Da dieser User **keinen** echten Stripe-Kauf hat, wird **kein** Eintrag in `subscriptions` angelegt. Damit greift auch der `sync_profile_from_subscription`-Trigger nicht und überschreibt den Plan nicht.

### 3. Verifikation
- Kurze SELECT-Abfrage zur Bestätigung, dass User + Profil + Elite-Plan korrekt verknüpft sind.

## Hinweise

- **Keine Code-Änderungen** nötig — reine Daten-Operation.
- **Keine** Admin-Rolle (`user_roles`) — der User soll nur Elite-Funktionen nutzen, nicht das Admin-Panel.
- Der Account ist sofort einsatzbereit; Login über die normale Login-Seite.