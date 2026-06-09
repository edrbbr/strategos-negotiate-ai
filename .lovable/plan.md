## Ziel

Hierarchische Rollenverwaltung pro Geschäftskunde mit Drag-&-Drop-Reihenfolge, deaktivierbaren (statt löschbaren) Standardrollen, delegierbarem Verwaltungsrecht und strikter Rabattlimit-Monotonie.

---

## 1. Datenmodell

`**business_custom_roles` erweitern**

- `rank` int (NOT NULL, eindeutig pro `business_account_id`) — Sortierreihenfolge, kleinste Zahl = niedrigste Stufe.
- `is_active` boolean default true (für Deaktivierung).
- `is_builtin` boolean default false — markiert die drei Standardrollen.
- Constraint: `UNIQUE (business_account_id, rank)` (deferrable, damit Drag&Drop-Resort möglich).

`**business_settings` erweitern**

- `role_admin_user_ids` uuid[] default '{}' — Manager-`business_users.id`s, die zusätzlich zur Leitung Rollen verwalten dürfen.

**Built-in-Rollen beim Account-Setup seeden**

- Trigger `create_default_business_settings` ergänzt: legt 3 Zeilen in `business_custom_roles` an
  - `sachbearbeiter` rank=10, limit=10%, base=sachbearbeiter, is_builtin=true
  - `manager` rank=20, limit=25%, base=manager
  - `leitung` rank=30, limit=100%, base=leitung
- Backfill-Migration für bestehende Accounts.
- Leitung-Zeile ist unlöschbar UND nicht deaktivierbar (DB-Trigger).

`**effective_discount_limit()` umbauen**

- Liest immer aus `business_custom_roles` (Built-ins sind dort jetzt auch drin) statt aus `business_settings.max_discount_limits`.
- Wenn `business_users.custom_role_key` gesetzt → diese Rolle, sonst Rolle die zum `role`-Feld passt (`base_role` Match).

**SQL-Validierung (Trigger auf `business_custom_roles`)**

- Rabattlimit-Monotonie: bei INSERT/UPDATE prüfen, dass `max_discount_percent` ≥ alle aktiven Rollen mit niedrigerem Rank und ≤ alle mit höherem Rank im selben Account.
- Leitung-Zeile: `is_active=true`, `is_builtin=true` erzwingen, Löschen blockieren.

---

## 2. Berechtigungen

**Neue SQL-Helferfunktion `can_manage_roles(_user, _account) returns boolean**`

- True wenn Rolle = `leitung` ODER `business_users.id` in `business_settings.role_admin_user_ids`.

Verwendet in:

- RLS-Policies für `business_custom_roles` (INSERT/UPDATE/DELETE)
- Edge Function `b2b-invite-user` (Rollenvergabe nur ≤ eigener Rang)
- UI-Gating

**Rang-basiertes Einladen**

- `b2b-invite-user` lädt eingeladene Rolle nur zu, wenn deren `rank` ≤ Rang der einladenden Person.

---

## 3. UI

**Neue Datei `src/components/retail/settings/RoleHierarchyEditor.tsx**` (ersetzt `CustomRolesEditor.tsx`)

- Liste aller Rollen (Built-in + Custom) sortiert nach `rank` absteigend (Leitung oben).
- Drag-Handle pro Zeile (`@dnd-kit/sortable` — bereits via shadcn nicht vorhanden, neu installieren).
- Pro Zeile: Label, Limit %, Toggle „Aktiv" (für Built-ins außer Leitung erlaubt, für Custom auch), Edit, Löschen (nur Custom, nur wenn keine Nutzer zugeordnet → sonst Hinweis).
- Inline-Validierung Rabattlimit (Min/Max aus Nachbar-Rängen).
- Speichern nach Drag: Batch-Update der `rank`-Werte via neue Edge Function `b2b-roles-reorder`.

**Neuer Bereich „Rollen-Admins" in `RetailSettings.tsx**`

- Nur sichtbar für Leitung.
- Multi-Select aller Manager (`role IN ('manager')`) → schreibt `business_settings.role_admin_user_ids`.

`**RetailTeam.tsx**`

- Rollen-Dropdown beim Einladen zeigt nur Rollen mit `rank` ≤ eigenem Rang und `is_active=true`.
- Anzeige der Rolle pro User aus `business_custom_roles` (Label statt Hardcoded Mapping).
- Bestehende `custom_role_key`-Logik wird redundant → `role`-Feld bleibt für Built-in-Berechtigungs-Gating (`base_role`), Anzeige nutzt aufgelöste Rolle.

`**AdminB2BAccount.tsx**`

- Gleicher Editor unter „Rollen", für Plattform-Admin lesbar + editierbar.

---

## 4. Migration & Cleanup

1. Migration: Schema-Änderungen + Trigger + Backfill (Built-ins für bestehende Accounts seeden, Rank vergeben).
2. Edge Function `b2b-roles-reorder` (atomare Rank-Reordering-Transaktion mit Monotonie-Check).
3. UI-Refactor + Dependency `@dnd-kit/core` + `@dnd-kit/sortable`.
4. `useCustomRoles.ts` umbenennen → `useRoleHierarchy.ts`, gibt sortierte Liste inkl. Built-ins zurück.
5. `roleLabel`/`roleRank` Konstanten in `useBusinessAccount.ts` werden Fallback, Primärquelle ist DB.

---

## Technische Details

- Drag&Drop: `@dnd-kit/core` + `@dnd-kit/sortable` (leichter als react-beautiful-dnd, gut mit Tailwind).
- Rank-Werte als Lücken-Schema (10/20/30…), Reorder vergibt komplett neue Sequenz (10/20/30…) um Constraint-Konflikte zu vermeiden.
- `base_role` bleibt das Berechtigungs-Anker für Edge Functions (Approval-Logik, Reopen etc.) — eine Custom-Rolle „Teamleiter" mit `base_role=sachbearbeiter` hat weiter Sachbearbeiter-Rechte, nur Rang & Limit ändern sich.
- Leitung-Schutz: DB-Trigger BEFORE DELETE/UPDATE auf `business_custom_roles` blockiert Löschung und `is_active=false` für `base_role=leitung` + `is_builtin=true`.

---

## Geänderte/neue Dateien

**Neu:** Migration, `b2b-roles-reorder/index.ts`, `RoleHierarchyEditor.tsx`, `useRoleHierarchy.ts`, `RoleAdminsSection.tsx`.

**Geändert:** `b2b-invite-user/index.ts`, `b2b-case-decide/index.ts` (limit-lookup), `b2b-approval-decide/index.ts`, `RetailSettings.tsx`, `RetailTeam.tsx`, `AdminB2BAccount.tsx`, `useBusinessAccount.ts`, `package.json` (dnd-kit).

**Entfernt:** `CustomRolesEditor.tsx`, `useCustomRoles.ts`.