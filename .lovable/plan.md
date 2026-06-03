
# B2B Fall-Detail: Analyse, Strategie, Optionen + Refinement

## Ziel

Nach „Fall analysieren" auf `/retail/app/cases/new` landest du auf `/retail/app/cases/:id` und siehst eine vollwertige Arbeitsoberfläche im Stil der B2C-Strategos-Seite — mit:

- **Analyse** (KI-Einschätzung + Risiken)
- **Strategie** (Begründung des empfohlenen Vorgehens)
- **3 Vorschläge** (konservativ / mittel / kulant) inkl. Kunden-Wortlaut
- **Refinement-Chat** zum iterativen Anpassen („freundlicher", „biete 15% statt 10%", „kürzer", „auf Englisch")
- **Versions-Historie** jeder Verfeinerung

**Begrenzungen:** Eskalationen (Sachbearbeiter/Manager/Leitung) bleiben — sie sind das Produktkernfeature. **Keine** Plan-/Tarif-Limits wie bei B2C: unbegrenzte Refinements, Anhänge, keine Upgrade-Modals.

## Drei Layout-Varianten zur Wahl

Du hast drei Stile genannt — bitte wähle nach dem Plan eine aus, dann baue ich nur diese:

### Variante A — 1:1 Strategos-Stil
Zwei-Spalten-Layout exakt wie `src/pages/CaseDetail.tsx`:
- Header mit Case-ID + Status-Badge
- Drei farbige Progress-Segmente (Analyse · Strategie · Draft)
- Links: Situations-Box (read-only) + Meta (Kanal, Kundentyp, Kaufpreis)
- Rechts: drei StageBoxen (Analyse / Strategie / Optionen-Draft) mit denselben Akzentfarben (secondary / primary / tertiary)
- Unten: gleiche `CaseChatView`-artige Refinement-Timeline mit V0/V1/V2…-Versionen + Sticky-Eingabe

### Variante B — Inspiriert, B2B-angepasst
Gleiche Bausteine, aber für 3-Optionen-Vergleich optimiert:
- Top: Analyse + Risiken kompakt als Kachel-Paar
- Mitte: 3 Optionen als nebeneinanderliegende Karten mit Eskalations-Badge, Direkt-Freigabe-Button und „Diese Option verfeinern"-Aktion
- Unten: Refinement-Chat als Timeline + Sticky-Eingabe (wie A, aber schlanker)

### Variante C — ChatGPT-Style Chat
Reines Chat-Fenster:
- Erste Bubble (KI): Analyse + Risiken als Markdown
- Zweite Bubble (KI): 3 Optionen als formatierte Karten innerhalb der Bubble, inkl. Freigabe-Buttons
- Folge-Bubbles: User-Prompts links/rechts + KI-Antworten mit aktualisierten Optionen
- Unten Sticky-Composer (Textarea + Send) wie ChatGPT — voll vertikal, kein Zwei-Spalten-Layout

## Technische Umsetzung

### Datenbank
- **Neue Tabelle** `business_case_versions` (id, case_id, business_account_id, version_number, kind: `initial|refinement|restore`, user_prompt, ai_analysis jsonb, ai_options jsonb, recommended_index, created_by, created_at). Beim ersten Pipeline-Run wird V1 (kind=`initial`) angelegt.
- **Spalte** `business_cases.current_version_id uuid` (FK auf Versions-Tabelle), wird bei jedem Refinement aktualisiert.
- RLS: nur Mitglieder des `business_account_id` lesen/schreiben; GRANTs für `authenticated` + `service_role`.

### Edge Functions
- **`retail-shield-pipeline`** (vorhanden): erweitern → schreibt Ergebnis zusätzlich als V1 in `business_case_versions`.
- **`b2b-case-refine`** (neu): nimmt `{ case_id, instruction }`, lädt aktuelle Version + Mandanten-RAG, ruft Gemini mit System-Prompt „Verfeinere die bestehenden 3 Optionen gemäß Anweisung — gleiche Struktur, gleiche Anzahl", schreibt neue Version, setzt `current_version_id`. Keine Tier-Checks. Mitgliedschaft wird via `business_users` verifiziert.

### Frontend
- **Hooks** (`src/hooks/useBusinessCases.ts`): `useBusinessCaseVersions(caseId)`, `useRefineBusinessCase()`, `useRestoreBusinessCase()`.
- **Neue Komponente** je nach Variante:
  - A: `RetailCaseStrategosView.tsx` (Kopie der Strategos-Struktur, an B2B-Schema gemappt)
  - B: `RetailCaseOptionsView.tsx`
  - C: `RetailCaseChatView.tsx`
- **`RetailCaseDetail.tsx`**: aktuelle Logik beibehalten, aber Rendering komplett durch gewählte Variante ersetzen.
- Eskalations-Badge + Direkt-Freigabe-Button bleiben pro Option erhalten (das ist das Produkt).

### Was bleibt unverändert
- `RetailNewCase.tsx` (Formular ist ok)
- `useDecideCase`, `useApprovals`, Freigabe-Pipeline
- Keine Plan-/Limit-Checks im B2B-Bereich

## Offene Frage vor Bau

Bitte sag mir, welche Variante (A/B/C) ich bauen soll — dann lege ich Migration + Edge Function + UI in einem Zug an.
