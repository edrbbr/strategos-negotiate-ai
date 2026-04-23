

# Fix: Strategie-JSON & smartes Strategy-Update bei Refinement

## Befund (aus DB)
Alle 8 Versionen V1–V8 haben **identisch** denselben Strategy-Wert. Der Wert ist ein roher JSON-String:
```
{"strategy": "Chris Voss/FBI-Methode — Diese Methode fokussiert..."
```

Zwei getrennte Bugs:

### Bug A — Roh-JSON in `strategy`
In `multiStage.ts` ruft Stage 2 `callOpenAI(...)` mit Tool-Call. Stage liest `strategyOut.strategy`. Bei OpenAI gibt das Tool-Call-Wrapping aber offenbar manchmal `{ strategy: '{"strategy": "..."}' }` zurück — also einen JSON-String **innerhalb** des Felds. Das wird via `String(strategyOut.strategy ?? "")` direkt in die DB geschrieben. Da Stage 3 (Draft) den Strategy-String nur weiterreicht, fällt es in der Pipeline nicht auf.

→ **Fix**: Defensives Unwrapping nach Stage 2 — wenn der String mit `{` startet und valides JSON mit `strategy`-Key ist, den inneren Wert extrahieren. Identisch in `singleCall.ts` für die Anti-Korruption-Schicht.

→ **Frontend-Härtung in `CaseChatView.tsx`**: Render-Funktion `renderStrategy(raw)` die JSON-Wrapper erkennt und nur den Klartext zeigt — schützt auch vor zukünftigen Modell-Macken.

→ **Daten-Migration für bestehende 8 Versionen** dieses Falls (und alle anderen betroffenen Zeilen): UPDATE, das `strategy` aus dem JSON entpackt, wenn er mit `{"strategy":` beginnt. Gleiches für `cases.strategy`.

### Bug B — Strategie ändert sich nie bei Refinement
`strategos-refinement/index.ts` Zeile 204: `strategy: latest.strategy` und Zeile 206: `strategy_labels: latest.strategy_labels` werden **immer** vom Vorgänger kopiert. Der zuvor approvte Smart-Classifier wurde nie eingebaut.

→ **Fix**: Smart-Classifier vor dem Draft-Call:
1. Klassifikator-Call (Gemini 2.5 Flash-Lite, ~50 Tokens, JSON-Mode):
   ```
   System: "Entscheide, ob die User-Instruktion eine neue Verhandlungsstrategie verlangt
   oder nur den Draft-Stil betrifft. Antworte als JSON: 
   { regenerate_strategy: bool, strategy_labels: string[] }.
   Verfügbare Labels: harvard, chris_voss, ackerman, batna, win_win, hard_bargaining."
   User: instruction + aktuelle Strategie als Kontext
   ```
2. Wenn `regenerate_strategy=true`:
   - Strategy-Call (Gemini 2.5 Flash) mit V1-Analyse + alter Strategie + Instruktion → neuer Strategie-Klartext (NICHT als JSON gewrappt — wir parsen `choices[0].message.content` direkt als String)
   - Labels aus dem Klassifikator übernehmen
3. Wenn `false`: Strategie/Labels weiterhin vom Vorgänger kopieren (heutiges Verhalten)
4. Draft-Call wie heute, jetzt aber mit der **neuen** Strategie als Kontext, falls regeneriert
5. **Analyse**: weiter immer aus **V1** kopieren (wie zuvor entschieden) — nicht aus `latest`, sondern explizit aus dem ältesten `case_versions`-Eintrag ziehen, damit die Analyse über alle Versionen stabil V1 entspricht

Fehlertoleranz: Klassifikator-Fehler (429/Timeout) → Fallback auf reinen Draft-Pfad (heutiges Verhalten), kein Crash.

## Dateien

| Datei | Änderung |
|---|---|
| `supabase/functions/strategos-ai-router/pipelines/multiStage.ts` | Strategy-String entwrappen (`unwrapStrategy()`), bevor Stage 3 + DB-Persist |
| `supabase/functions/strategos-ai-router/pipelines/singleCall.ts` | Gleiches Unwrapping als Safety-Net |
| `supabase/functions/strategos-refinement/index.ts` | Klassifikator-Call + bedingter Strategy-Call + V1-Analyse-Lookup |
| `src/components/CaseChatView.tsx` | `renderStrategy()` Helper für defensives Anzeigen |
| Migration | `UPDATE case_versions SET strategy = (strategy::jsonb->>'strategy') WHERE strategy LIKE '{"strategy":%'` + selbiges für `cases` |

## Akzeptanzkriterien
- Bestehende 8 Versionen zeigen sofort Klartext-Strategie statt `{"strategy":"…"}`
- Neue Refinements mit Instruktion „nutze Harvard-Stil" / „andere Strategie" produzieren sichtbar **andere** Strategie + ggf. neue Labels
- Refinements mit Instruktion „kürzer" / „freundlicher" lassen Strategie unverändert (Token-Sparsam)
- Analyse-Akkordeon zeigt weiterhin V1-Analyse, identisch über alle Versionen
- Bei Klassifikator-Ausfall: Refinement schlägt nicht fehl, sondern verhält sich wie heute (nur Draft neu)

## Nicht enthalten
- Diff-Highlighting alt vs. neu Strategie
- Manueller Override-Toggle „Strategie erzwingen"
- Re-Generierung der Analyse pro Refinement (bewusst durch User-Wahl ausgeschlossen)

