## Problem

Die Konsole zeigt bei jedem Aufruf:
```
permission denied for function has_role
```

Das bedeutet: Die SQL‑Funktion `public.has_role(uuid, app_role)` ist nur für `postgres` und `service_role` ausführbar, **nicht** für die Rolle `authenticated`. Die RLS‑Policies auf `user_roles` ("Admins manage roles", "Admins view all roles") rufen aber genau diese Funktion auf. Beim Lesen schlägt die Policy‑Auswertung deshalb fehl, der Hook `useUserRole` bekommt einen Fehler und liefert `isAdmin = false` zurück.

Folgen:
- Der Admin‑Link in der App‑Sidebar (`AppSidebar.tsx`, schon vorhanden, `roleInfo?.isAdmin`‑gated) wird nie angezeigt.
- `AdminRoute` leitet `/admin` zurück auf `/app/dashboard`.

Dein Admin‑Eintrag in `user_roles` existiert bereits — es ist also reines Rechte‑Problem auf Datenbank‑Ebene.

## Lösung

Eine kleine Migration, die der Funktion `has_role` (und der parallelen B2B‑Helper, falls vorhanden) das Execute‑Recht für die Auth‑Rollen gibt:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, anon;
```

Falls die B2B‑Migration zusätzliche Helper wie `is_business_member`, `get_user_business_account`, `business_role_rank` eingeführt hat, bekommen die im gleichen Zug ebenfalls `GRANT EXECUTE … TO authenticated`, damit dasselbe Problem nicht im Retail‑Bereich wieder auftaucht.

Kein Frontend‑Change nötig — die Sidebar zeigt den Admin‑Link bereits automatisch, sobald `useUserRole` `isAdmin = true` zurückgibt, und `AdminRoute` lässt dich dann durch.

## Verifikation nach dem Apply

1. Seite neu laden → die Warnung `permission denied for function has_role` verschwindet aus der Konsole.
2. In der linken Sidebar (`/app/...`) erscheint der Admin‑Eintrag.
3. `/admin` und `/admin/b2b` sind direkt erreichbar.