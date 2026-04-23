

# Layout-Umbau: Analyse separat, Mittelblock zeigt Prompt | Strategie | Entwurf

## Ziel
- **Analyse** wird einmalig **über** der Versionsliste angezeigt — sie ist ohnehin für alle Versionen identisch (V1-fix, siehe vorherige Entscheidung).
- **Pro Version** zeigen wir drei Spalten nebeneinander: **User-Prompt | Strategie | Entwurf**
- Analyse-Box ist standardmäßig **zugeklappt**, außer beim ersten Besuch direkt nach Fall-Erstellung.

## UI-Änderungen in `src/components/CaseChatView.tsx`

### 1. Neuer Block oberhalb der Versions-Timeline: `AnalysisAccordion`
Position: zwischen `InitialBlock` (V0 INITIAL) und der ersten Version.

Aufbau (mit `Collapsible` aus `@/components/ui/collapsible`):
```text
┌─────────────────────────────────────────────┐
│ ▼ ANALYSE  ·  6 Punkte                      │  ← Trigger
├─────────────────────────────────────────────┤
│ ◆ Punkt 1                                    │
│ ◆ Punkt 2                                    │
│ ◆ …                                          │  ← Content
└─────────────────────────────────────────────┘
```

Datenquelle: `versions[0]?.analysis` (V1-Analyse, gilt für alle Versionen).
Wird nicht gerendert, wenn keine Analyse vorhanden.

### 2. Default-Open-Logik
State: `const [analysisOpen, setAnalysisOpen] = useState(initialOpen)`

`initialOpen` ist `true`, wenn:
- nur **eine** Version existiert (`versions.length === 1`), UND
- diese Version `kind === "initial"` hat, UND
- es im `localStorage` noch keinen Eintrag `case-analysis-seen:{caseId}` gibt.

Sobald der User das Accordion einmal schließt **oder** eine zweite Version (Refinement/Restore) entsteht, setzen wir den `localStorage`-Marker. Beim nächsten Besuch ist das Accordion damit zu — auch wenn der User nicht aktiv geschlossen hat.

### 3. `VersionBlock` — Drei-Spalten-Grid umbauen
Aktuell: `Analyse | Strategie | Entwurf`
Neu: `User-Prompt | Strategie | Entwurf`

- Die separate User-Prompt-Bubble oberhalb der Karte (`showUserBubble`-Block) **entfällt** — der Prompt zieht in die linke Spalte.
- Linke Spalte „PROMPT" (tertiary-Akzent, passend zum bisherigen Bubble-Styling):
  - Bei `kind === "initial"`: Hinweistext „Erste Version aus dem Initial-Setup"
  - Bei `kind === "restore"`: „Wiederhergestellt aus V{n}" (kann auf Basis von `user_prompt` formatiert bleiben, falls Backend dort die Quell-Version reinschreibt)
  - Sonst: `version.user_prompt` in `font-serif italic`
- Mittlere Spalte „STRATEGIE": unverändert
- Rechte Spalte „ENTWURF": unverändert
- Strategie-Labels-Chip-Reihe darunter bleibt

### 4. `InitialBlock` (V0)
Bleibt wie er ist (Sprache, Format, Situationstext). Analyse hatte er ohnehin nicht.

### 5. `PendingBlock` Skeleton
Auch dort die Spalten umbenennen: Skeleton für Prompt | Strategie | Entwurf statt Analyse | Strategie | Entwurf.

## Was unverändert bleibt
- Datenmodell, Edge Functions, Refinement-Logik, Restore, Quick-Suggestions, Realtime, Auth.
- Strategie-Labels-Chips.
- Sticky-Input-Bereich, Suggestion-Chips.
- `analysis`-Feld in `case_versions` wird weiterhin gespeichert (V1-fix), nur die Darstellung ändert sich.

## Technische Details
- Datei: nur `src/components/CaseChatView.tsx`
- Imports ergänzen: `Collapsible, CollapsibleTrigger, CollapsibleContent` (bereits vorhandene Komponente), `ChevronDown` aus `lucide-react` für den Trigger-Pfeil.
- Grid bleibt `grid lg:grid-cols-3 gap-4`, mobil weiterhin gestapelt.
- Keine DB-Änderungen, keine Edge-Function-Änderungen.

## Akzeptanzkriterien
- Analyse erscheint genau einmal pro Fall, oberhalb aller Versionen.
- Beim allerersten Öffnen einer frisch erzeugten V1: Analyse offen.
- Nach Schließen oder ab V2: Analyse beim nächsten Aufruf zugeklappt.
- Jede Version zeigt drei Spalten in der Reihenfolge `Prompt | Strategie | Entwurf`.
- V0 (INITIAL) bleibt als eigener oberer Block bestehen (Situation).
- Kein Duplikat: User-Prompt erscheint nicht mehr zusätzlich als Bubble darüber.

