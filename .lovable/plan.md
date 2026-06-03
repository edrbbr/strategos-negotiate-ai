## Ursache

Das Speichern der Rabatt-Limits scheitert an zwei Problemen in `RetailSettings.tsx` + DB:

1. **Spalten fehlen**: Das Update schreibt `currency` und `default_vat_rate` in `business_settings` — diese Spalten existieren nicht in der Tabelle. Postgres bricht den gesamten Update-Aufruf mit einem Fehler ab, also wird auch `max_discount_limits` nicht gespeichert.
2. **Kein Row vorhanden / kein INSERT**: `business_settings` hat keine INSERT-Policy und der Code nutzt `.update()` statt `.upsert()`. Wenn für den Mandanten noch keine Zeile existiert, läuft das Update ins Leere (0 rows affected, ohne Fehler).

## Fix

### A) Migration `business_settings` erweitern
- Spalten ergänzen: `currency text not null default 'EUR'`, `default_vat_rate numeric not null default 19`.
- INSERT-Policy: `Leitung inserts settings` (Manager+ darf Settings anlegen, analog zur Update-Policy mit `business_role_rank >= 3`).
- Trigger sicherstellen: Beim Anlegen eines `business_accounts` automatisch ein `business_settings`-Row erzeugen (falls noch nicht vorhanden) — sonst per Upsert im Client.

### B) `RetailSettings.tsx`
- `.update(...).eq(...)` → `.upsert({ business_account_id, ...patch }, { onConflict: "business_account_id" })`.
- Validierung: `sb ≤ mg ≤ lt`, jeweils 0–100, sonst Toast mit Hinweis und kein Submit.
- Loading-State auf Button (`Speichere…`), Fehler-Toast zeigt jetzt sichtbaren DB-Fehler.

### C) `useBusinessAccount.ts` / Types
- `BusinessSettings`-Type um `currency` und `default_vat_rate` erweitern (kommt automatisch via `types.ts`-Regeneration nach Migration).

## Offene Frage

Soll ich beim Anlegen eines Mandanten via Edge Function `b2b-admin-create-account` automatisch ein leeres `business_settings`-Row mit den Defaults anlegen (sauberste Lösung), oder reicht der Upsert im Client?
