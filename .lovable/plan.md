

# Refinement-Chat: Fall-spezifische, KI-generierte Quick-Actions

Anpassung des bereits genehmigten Plans. Alles andere bleibt wie freigegeben — nur **Phase E** wird ersetzt.

## Phase E (NEU) — Dynamische, fall-spezifische Quick-Action-Prompts

### Neue Edge Function `strategos-suggest-refinements`
Generiert pro Fall 4 maßgeschneiderte Verbesserungs-Vorschläge auf Basis von Situation, Analyse, Strategie und aktuellem Draft.

**Input**: `{ case_id }`
**Auth**: `auth.getUser(token)` (gleiches Muster wie Refinement)
**Modell**: `google/gemini-2.5-flash-lite` (billigstes Modell, ~0,003 ¢ pro Aufruf — bewusst klein gehalten)
**Output via Tool-Call** (strukturiert, kein freier Text):
```json
{
  "suggestions": [
    { "label": "Frist klarer setzen", "prompt": "Schreibe den Entwurf so um, dass die 14-Tage-Frist als harte Deadline mit konkreter Konsequenz formuliert wird." },
    { "label": "Chris-Voss-Mirroring", "prompt": "Baue gezielte Mirroring-Fragen ein, die die Position der Gegenseite zurückspiegeln." },
    { "label": "Empathie für Schaden", "prompt": "Erkenne den finanziellen Druck der Gegenseite an, ohne in der Sache nachzugeben." },
    { "label": "Eskalationspfad andeuten", "prompt": "Deute den Anwaltsweg an, ohne ihn explizit zu drohen." }
  ]
}
```

Das Modell bekommt im System-Prompt:
- Sprache des Falls (Antwort muss in `language_label` sein)
- Medium (z. B. WhatsApp → kürzere, lockerere Vorschläge)
- Hinweis auf bekannte Verhandlungsstrategien aus `negotiation_strategies` als Inspiration
- Constraint: 4 Vorschläge, jeweils max. 4 Wörter Label, Prompt 1 Satz

### Caching auf `cases`
Neue Spalte:
- `quick_suggestions jsonb` (nullable) — zuletzt generiertes Vorschlags-Array
- `quick_suggestions_version_id uuid` — auf welche `case_versions.id` sie sich beziehen

So wird **nicht** bei jedem Öffnen neu generiert. Regeneriert wird nur, wenn:
- noch keine Vorschläge existieren, oder
- `cases.current_version_id` ≠ `quick_suggestions_version_id` (also nach Pipeline-Lauf, Refinement oder Restore)

Damit: pro neuer Version genau **1** zusätzlicher Mini-AI-Call. Das ist günstig und immer aktuell.

### Trigger-Punkte
- Nach `strategos-ai-router` (initialer Lauf): Function feuert `strategos-suggest-refinements` selbst am Ende (fire-and-forget, kein Blocker für die Antwort)
- Nach `strategos-refinement`: gleiches Muster
- Nach `strategos-restore-version`: gleiches Muster
- Frontend-Fallback: wenn Vorschläge fehlen oder veraltet sind, ruft das Frontend `strategos-suggest-refinements` einmalig nach

### Frontend
Neuer Hook `useQuickSuggestions(caseId)`:
- Liest `cases.quick_suggestions`
- Realtime auf `cases`-Update
- Bei `null` oder veraltet → automatisch Edge-Function aufrufen, Skeleton anzeigen

Im Chat-Layout über dem Eingabefeld:
- 4 Chip-Buttons mit `label`
- Klick → schreibt `prompt` ins Eingabefeld (kein Auto-Send, wie vom User bestätigt)
- Während Generierung: 4 Skeleton-Chips statt Text

### Fehlerverhalten
- 429/402 vom Lovable-Gateway → Vorschläge bleiben weg, Chat funktioniert trotzdem (Eingabefeld bleibt frei nutzbar). Toast nur bei explizitem manuellen Re-Trigger.

## Akzeptanzkriterien für Phase E
- Quick-Actions sind nie statisch, sondern KI-generiert pro Fall
- Vorschläge passen erkennbar zu Situation, Analyse, Strategie und Medium
- Sprache der Vorschläge = Sprache des Falls
- Kein Mehrfach-Aufruf pro Version (Caching greift)
- Klick auf Vorschlag füllt nur das Input-Feld, sendet nicht

## Was unverändert bleibt
Phasen A (Auth-Bugfix), B (`case_versions` + `negotiation_strategies` + `current_version_id`), C (Versions-Inserts + Sniper-Refinement) und D (Chat-Layout, Restore, sticky Input, Realtime) bleiben exakt wie zuvor freigegeben.

