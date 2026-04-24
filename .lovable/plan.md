
# Fix: Preisinformationen werden auf `/preise` nicht geladen

## Ursache (verifiziert)
- Frontend (`src/hooks/usePlans.ts`) liest aus der View `public.plans_public`.
- Diese View wurde nach dem Sicherheits-Hardening mit `WITH (security_invoker=true)` neu erstellt — sie führt SELECTs **mit den Rechten des aufrufenden Users** aus.
- Die Basistabelle `public.plans` hat `SELECT` für `anon` **und** `authenticated` revoked (`can_select=false`).
- Folge: Jeder Aufruf der View läuft in `permission denied for table plans` (PostgREST-Fehler 42501) → React-Query setzt `isError=true` → die Modal/Page zeigt "Preisinformationen vorübergehend nicht verfügbar".

Die Console-Log-Zeile bestätigt das exakt:
```
Failed to load profile {code: "42501", message: "permission denied for table plans"}
```
(Der gleiche Fehler trifft auch `usePlans` — der Logger heißt nur "Failed to load profile", weil derselbe Code-Pfad das Profil lädt.)

## Fix (ein Schritt)
Migration, die die `plans_public`-View **als `SECURITY DEFINER`** neu definiert (oder alternativ auf `security_invoker=false` umstellt, was äquivalent ist) und SELECT-Rechte sauber an `anon`/`authenticated` vergibt. Damit nutzt die View die Rechte des View-Owners (`postgres`/`supabase_admin`) für die Lesung der Basistabelle, exponiert aber nur die nicht-sensitiven Spalten — `pipeline_config` bleibt verborgen.

```sql
-- Re-create plans_public WITHOUT security_invoker, so it reads `plans`
-- with the view owner's privileges. The view still hides pipeline_config,
-- model_id, and other internal columns.
DROP VIEW IF EXISTS public.plans_public;

CREATE VIEW public.plans_public AS
SELECT
  id,
  tier_label,
  name,
  tagline,
  badge,
  case_limit,
  case_limit_type,
  is_recommended,
  sort_order,
  is_active,
  created_at,
  updated_at
FROM public.plans
WHERE is_active = true;

GRANT SELECT ON public.plans_public TO anon, authenticated;

-- Belt & suspenders: ensure the base table stays locked down to anon/auth
REVOKE SELECT ON public.plans FROM anon, authenticated;
```

## Was sich nicht ändert
- `pipeline_config`, `model_id` bleiben **unsichtbar** für Clients (nicht in der View).
- Edge Functions (z. B. `strategos-ai-router`) lesen `plans` weiterhin via Service-Role — unverändert funktionsfähig.
- `plan_prices` und `plan_features` haben bereits korrekte Public-RLS und brauchen nichts.

## Dateien
| Datei | Änderung |
|---|---|
| Neue SQL-Migration | View `plans_public` als `SECURITY DEFINER` neu anlegen, GRANT SELECT für `anon`/`authenticated` |

## Verifikation nach dem Apply
1. `/preise` neu laden → Pläne erscheinen.
2. Console-Errors `permission denied for table plans` verschwinden.
3. `select * from public.plans` als anon → weiterhin verboten.
4. `select * from public.plans_public` als anon → liefert die 3 aktiven Pläne ohne `pipeline_config`.
