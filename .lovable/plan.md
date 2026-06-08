## Ziel

Den Retail-Fall-Workflow auf reales Verhandeln umstellen: nur **eine** klar begründete KI-Empfehlung statt drei pauschaler Optionen, expliziter Abschluss inkl. tatsächlich verhandeltem Betrag, Reopen-Funktion, frei definierbare Firmenrollen mit eigenen Limits, sowie branchenspezifische KI durch eine Branchen-Picklist.

---

## 1) Fall-Liste: Abschluss-Button, Status-Label, Reopen

**`src/pages/retail/app/RetailCases.tsx`**
- Pro Zeile eine Aktionsspalte:
  - Status `open` / `in_review` / `waiting_approval` → Button **„Als abgeschlossen markieren"** (öffnet Modal).
  - Status `closed` → Button **„Fall wieder öffnen"** (setzt Status zurück auf `in_review`, schreibt Log-Eintrag, `closed_at = null`, behält `final_granted_amount` zur Historie).
- Statusbezeichnung im UI:
  - `waiting_approval` wird angezeigt als **„In Eskalation"** (statt „Eskalation wartend"). Reine Anzeige-Mappings, keine Enum-Änderung.

**Neues Modal `src/components/retail/case/CloseCaseModal.tsx`**
- Felder:
  - „Tatsächlich verhandelter Betrag" — Eingabe als Euro mit Komma (z. B. `129,50`). Parsing via `parseEuroInput(s) → number` (Komma → Punkt, Tausenderpunkt entfernen, Validierung ≥ 0, max = Kaufpreis × Menge × 2 als Sanity).
  - Optional „Notiz / Begründung".
- Bei Submit: ruft `b2b-case-decide` mit `final_amount` (Euro) und `final_percent` (auto-berechnet aus Kaufpreis) auf. Bestehende Limit-Prüfung greift — bei Überschreitung Fehlermeldung mit Hinweis „Bitte Genehmigung einholen".
- Anzeige der ersparten Summe vor Bestätigung: `Ersparnis = claimed_amount − eingegebener Betrag`.

**Reopen** über neue Edge-Funktion `b2b-case-reopen` (oder erweitertes `b2b-case-decide` mit `action: "reopen"`) — schreibt `business_case_logs` Eintrag `action: "reopened"`, setzt Status auf `in_review`, `closed_at=null`. Nur Manager/Leitung dürfen reopen.

---

## 2) KI-Ausgabe: eine Empfehlung statt drei Optionen

**`supabase/functions/retail-shield-pipeline/index.ts`**
- Prompt-Umbau: keine drei Optionen mehr. Stattdessen genau **eine** Empfehlung, die das *realistische Minimum* sucht, bei dem der Kunde sich noch als „Gewinner" fühlt. Limits sind **Obergrenze**, nicht Default.
- Neues JSON-Schema:
  ```json
  {
    "analysis": "…",
    "risk_assessment": "…",
    "recommendation": {
      "amount_eur": 0,
      "percent_of_purchase": 0,
      "rationale": "Warum genau dieser Betrag — Verhandlungslogik, BGB-Hebel, Branchenpraxis",
      "customer_wording": "Wortlaut für Mitarbeitenden",
      "email_draft": "Vollständiger E-Mail-Entwurf an Kunden",
      "required_role": "sachbearbeiter|manager|leitung|<custom_role_key>",
      "confidence": "low|medium|high"
    }
  }
  ```
- Speicherung: `business_cases.ai_options` wird weiterhin geschrieben (Array mit **einem** Eintrag) — abwärtskompatibel zu bestehenden Views/Versionen. `suggested_offer*` aus `recommendation` befüllen.
- `business_case_versions.recommended_index` immer 0.

**`src/components/retail/case/RefinementChat.tsx` / `ViewChat.tsx`**
- Rendern statt 3 Options-Cards:
  - **Eine** Empfehlungs-Card mit: Betrag, %, Begründung, Risiko-Block.
  - **„E-Mail-Entwurf kopieren"** Button (Clipboard).
  - **„Mitarbeiter-Wortlaut kopieren"** Button.
  - **„Als abgeschlossen markieren"** → öffnet dasselbe `CloseCaseModal` mit vorausgefülltem Betrag.
  - **„Genehmigung einholen"** Button:
    - **Immer sichtbar** (auch wenn Empfehlung im Limit liegt — Sachbearbeiter darf sich jederzeit absichern).
    - Wenn Empfehlung das Rollenlimit überschreitet, ist der Button hervorgehoben + Hinweis-Banner.
    - Öffnet kleinen Dialog mit Freitext „Worum bittest du?" und legt `business_approvals`-Eintrag an (existierende Tabelle).

`ViewStrategos` / `ViewOptions` werden gelöscht oder auf den neuen Single-View umgebaut (Variant-Switcher entfällt — nur `ViewChat` bleibt).

---

## 3) Frei definierbare Firmenrollen mit eigenen Limits

Bisher hartcodiert: `support_readonly | sachbearbeiter | manager | leitung`. Neu: zusätzlich **mandantenspezifische Custom-Rollen** (z. B. „Teamleiter", „Bereichsleitung").

**DB-Migration**
- Neue Tabelle `business_custom_roles`:
  - `business_account_id`, `role_key` (slug, unique je Account), `label`, `max_discount_percent`, `rank` (int, ordnet relativ zu Built-in: 0=support, 1=sachb., 2=manager, 3=leitung; custom dazwischen oder darüber), `created_at`, `updated_at`.
  - GRANTs + RLS: SELECT für alle Account-Members, INSERT/UPDATE/DELETE nur für Rolle Leitung (oder Admin).
- `business_users.custom_role_key` (text, nullable) — wenn gesetzt, hat sie Vorrang vor `role` für Limit-Berechnung. `role` bleibt für RLS-/Built-in-Logik bestehen (Custom-Rolle wird intern auf eine Built-in „gemappt", min. `sachbearbeiter`).

**Limits-Auflösung (überall einheitlich)**
- Neue SQL-Helper-Funktion `effective_discount_limit(_user uuid, _account uuid) → numeric` — gibt:
  - falls Custom-Rolle: deren `max_discount_percent`.
  - sonst: Wert aus `business_settings.max_discount_limits` für Built-in-Rolle.
- Verwendet in `b2b-case-decide`, `b2b-approval-decide`, `retail-shield-pipeline`.

**UI**
- `src/pages/retail/app/RetailSettings.tsx`: neue Sektion „Eigene Rollen" — CRUD-Liste (Label, Limit %, optional Mapping auf Built-in). Nur Leitung.
- `src/pages/retail/app/RetailTeam.tsx`: Rollen-Select zeigt Built-in + Custom-Rollen des Mandanten.
- `src/pages/admin/AdminB2BAccount.tsx`: gleiche Custom-Roles-Sektion zusätzlich im Admin-Setup, damit Lovable-Admin sie für den Kunden anlegen kann.
- `useBusinessAccount.ts`: `roleLabel` wird dynamisch (Built-in + DB-Lookup).

---

## 4) Branchen-Picklist (erweiterbar) + Branchen-Kontext für KI

**DB-Migration**
- Neue Tabelle `industries`:
  - `key` (slug, PK), `label`, `ai_context` (text — Branchenleitplanke für KI, z. B. „Möbelhandel: §§ 437/439 BGB, Spedition-Schäden, …"), `is_active`, `created_at`.
  - GRANTs: SELECT für `authenticated`; INSERT/UPDATE/DELETE nur für Admin (`has_role(auth.uid(),'admin')`).
- Seeding: `moebelhandel`, `kfz_werkstatt`, `elektronikhandel`, `baumarkt`, `bekleidung`, `lebensmittel`, `sonstiges` (mit kurzem `ai_context` je Branche aus bestehender `mem/features/pallanx-real.md`-Logik).
- `business_accounts.industry` bleibt `text`, soll aber bevorzugt `industries.key` enthalten.

**UI**
- `src/pages/admin/AdminB2B.tsx` (Create-Dialog) und `AdminB2BAccount.tsx`:
  - Branche als `<Select>` aus `industries` + kleines Plus-Icon „Neue Branche hinzufügen" (Inline-Dialog: `key`, `label`, `ai_context`) → schreibt direkt in `industries`. Nur Admin.

**KI-Integration**
- `retail-shield-pipeline`: lädt `industries` Zeile zur `caseRow.business_account_id → industry`. Injiziert `ai_context` in den Systemprompt: „Branche dieses Mandanten: <label>. Branchenspezifische Leitplanken: <ai_context>." So nutzt die KI Branchenrecht/-praxis (z. B. § 477 BGB bei Elektronik, Werkvertrag bei Kfz).

---

## 5) Cleanup / Konsistenz

- Drei-Optionen-Reste entfernen: `ViewOptions.tsx`, `ViewStrategos.tsx`, Variant-Switcher in `RetailCaseDetail.tsx`.
- Status-Mapping zentralisieren (`src/lib/businessCaseStatus.ts`) für Label + Badge-Farbe (inkl. neuer Anzeige „In Eskalation").
- `mem/features/pallanx-real.md` aktualisieren: „Genau 1 Empfehlung mit Begründung + E-Mail-Draft; Custom-Rollen mit eigenen Limits; Branchen-Kontext fließt in KI."

---

## Technische Details

**Migrationen (1 Stück, in dieser Reihenfolge):**
1. `CREATE TABLE public.business_custom_roles (...)` + GRANT + RLS + Policies.
2. `ALTER TABLE public.business_users ADD COLUMN custom_role_key text`.
3. `CREATE TABLE public.industries (...)` + GRANT + RLS + Policies + Seed-INSERTs.
4. `CREATE FUNCTION public.effective_discount_limit(...)` (SECURITY DEFINER).

**Edge-Funktionen geändert:**
- `retail-shield-pipeline` — neuer Prompt, neues JSON, Branchen-Kontext, Limit über `effective_discount_limit`.
- `b2b-case-decide` — Limit über `effective_discount_limit`; akzeptiert `action: "reopen"` (oder eigene `b2b-case-reopen`).
- `b2b-approval-decide` — gleiche Limit-Quelle.

**Frontend neu/geändert:**
- Neu: `src/components/retail/case/CloseCaseModal.tsx`, `src/lib/euro.ts` (parse/format), `src/lib/businessCaseStatus.ts`, `src/components/retail/settings/CustomRolesEditor.tsx`, `src/components/admin/IndustryPicker.tsx`.
- Geändert: `RetailCases.tsx`, `RetailCaseDetail.tsx`, `RefinementChat.tsx`, `RetailSettings.tsx`, `RetailTeam.tsx`, `AdminB2B.tsx`, `AdminB2BAccount.tsx`, `useBusinessAccount.ts`, `useBusinessCases.ts` (neue Mutations: `useCloseCase`, `useReopenCase`, `useRequestApproval`).

**Kompatibilität:** Bestehende offene Fälle behalten ihre `ai_options`-Arrays; die UI rendert nur Index 0. Keine Datenverluste.

---

## Reihenfolge der Umsetzung

1. Migration (Custom-Rollen, Industries, Helper-Function, Seed).
2. Pipeline-Umbau auf Single-Recommendation + Branchen-Kontext.
3. Frontend Single-Empfehlungs-View + Copy-Buttons + „Genehmigung einholen".
4. Close-Modal mit Euro-Komma-Eingabe + Reopen.
5. Custom-Rollen-Editor in Settings + Admin.
6. Branchen-Picklist in Admin + Inline-Add.
7. Cleanup ViewOptions/ViewStrategos, Status-Label-Refactor.
8. Memory aktualisieren.

Bitte bestätigen oder Anpassungen nennen, dann setze ich um.
