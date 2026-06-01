## Befund (aus DB + Logs)

DB-Zeile `case_versions` v1 dieses Falls:
- `strategy` = `"Zugeständnis- und Gegenforderungslogik"` (38 Zeichen — nur das Label aus der Whitelist, keine 2 Sätze, keine `tactical_principles`)
- `draft` = `""` (leer, 0 Zeichen)
- `variants` = `null`
- `recommended_variant` = `"neutral"`

Edge-Function-Logs: `multi-stage pipeline complete total_ms: 128659` — kein Fehler, kein Retry, kein Fallback ausgelöst. Vorher nur die bekannte `match_knowledge` Statement-Timeout-Warnung (RAG-Treffer leer, nicht ursächlich).

## Root Causes

**1. Strategie-Stage — Schema zu weich.**
`STRATEGY_SCHEMA` verlangt nur `{ strategy: string, recommended_variant: enum }`. Kein `minLength`, kein `tactical_principles`. Der Prompt fordert „Framework + 2 Sätze + tactical_principles" — das Modell hat trotzdem nur das Whitelist-Label zurückgegeben und damit das Schema formal erfüllt. Wir validieren danach nicht und schreiben den Stub in die DB.

**2. Draft-Stage — `max_tokens: 2048` zu klein.**
In `providers/anthropic.ts` ist `max_tokens` für ALLE Anthropic-Calls hart auf 2048 gedeckelt. Drei vollständige deutsche Varianten (soft/neutral/hard, jede mit Betreff, Anrede, mehreren Absätzen, Closing) + `title` + `plan_steps` passen nicht in 2048 Token. Folge: Claude liefert ein `tool_use`-Block, dessen `input.variants` entweder leer ist oder schlicht fehlt — Schema "required" wird vom Modell unter Token-Druck nicht zuverlässig erzwungen. `finalizeDraft` baut daraus klaglos `variants: null, draft: ""`.

**3. Keine Output-Validierung.**
`multiStage.ts` schreibt jede Stage roh in die DB. Ein leerer `draft` oder fehlende `variants` lösen weder `StageFailure` aus noch werden Fallbacks (Gemini) gezogen. Pipeline „endet erfolgreich" mit leerem Ergebnis → UI zeigt nichts.

## Lösung

### A. Strategie-Schema + Persistierung härten

In `supabase/functions/strategos-ai-router/pipelines/multiStage.ts`:

```ts
const STRATEGY_SCHEMA = {
  type: "object",
  properties: {
    framework_label: { type: "string", minLength: 3 },     // Whitelist-Tactic-Name
    rationale: { type: "string", minLength: 80 },          // 2 Sätze, warum dieses Framework
    tactical_principles: {                                  // konkrete B2B-Moves
      type: "array", minItems: 2, maxItems: 4,
      items: { type: "string", minLength: 20 },
    },
    recommended_variant: { type: "string", enum: VARIANT_KEYS },
  },
  required: ["framework_label", "rationale", "tactical_principles", "recommended_variant"],
  additionalProperties: false,
}
```

Vor `writeStage` zusammensetzen:

```
strategy = `${framework_label}\n\n${rationale}\n\nTaktische Prinzipien:\n• ${tactical_principles.join("\n• ")}`
```

Bonus: minLength im Schema zwingt OpenAI in der Tool-Antwort zu echtem Inhalt — keine reinen Labels mehr.

`PROMPT_STRATEGY` (`prompts.ts`) entsprechend auf die neuen Feldnamen umstellen (statt `strategy:` jetzt `framework_label`/`rationale`/`tactical_principles`).

### B. Draft-Token-Limit erhöhen

In `providers/anthropic.ts`: `TIMEOUT_MS` und Default `max_tokens` so lassen, aber `AnthropicCallParams.maxTokens` für den Draft-Call in `multiStage.ts` explizit setzen:

```ts
draftOut = await callAnthropic({
  ...,
  maxTokens: 8000,   // drei volle Varianten DE + plan_steps passen sicher rein
});
```

Analyse- und Strategie-Calls bleiben bei 2048 (ausreichend).

### C. Output-Validierung pro Stage

In `multiStage.ts` nach jedem Stage-Call vor `writeStage`:

```ts
// Strategie
if (!framework_label || !rationale || !Array.isArray(tactical_principles) || tactical_principles.length < 2) {
  throw stageError("strategy", ["analysis"], new ProviderError("EMPTY_STRATEGY_OUTPUT", 502, "EMPTY_OUTPUT", "openai"));
}

// Draft
const v = draftOut.variants as Record<string, string> | null;
const ok = v && v.soft?.trim() && v.neutral?.trim() && v.hard?.trim();
if (!ok) {
  throw stageError("draft", ["analysis","strategy"], new ProviderError("EMPTY_DRAFT_VARIANTS", 502, "EMPTY_OUTPUT", "anthropic"));
}
```

`StageFailure` wird vom bestehenden Top-Level-Catch in `index.ts` in `cases.pipeline_error` geschrieben — UI zeigt damit endlich „Stage failed" statt eines leeren Drafts.

### D. Draft-Fallback (analog zu Strategy)

Wenn `callAnthropic` für Draft `TIMEOUT` / `EMPTY_OUTPUT` wirft und `lovableKey` vorhanden ist, einmal mit `google/gemini-2.5-pro` über `callGemini` retryen (gleicher Prompt, gleiches Schema-Tool). Verhindert künftiges stilles Scheitern, wenn Claude wieder truncates.

### E. (Optional, klein) RAG-Statement-Timeout

`match_knowledge` läuft regelmäßig in Postgres-`statement_timeout`. Nicht Ursache hier, aber Folgeticket: `match_count` runter (8 → 5) und in `knowledge.ts` Try/Catch sauber als „keine Quellen" propagieren (bereits passiert, hier nur erwähnt — nicht Teil dieses Fixes).

## Validierung

1. Migration nicht nötig (alles in Edge-Function-Code).
2. Denselben Fall (`e88cfc29-…`) erneut über „Pipeline neu starten" anstoßen.
3. Erwartung:
   - `case_versions.strategy` enthält Framework-Label + Begründung + Bullet-Liste (mehrere hundert Zeichen).
   - `case_versions.draft` und `variants.soft/neutral/hard` sind alle befüllt.
   - In der UI sind alle drei Stages grün, Draft-Tab zeigt Text.
4. Negativtest: in `multiStage.ts` temporär Anthropic-Aufruf auf `maxTokens: 200` zwingen → Stage-Failure muss in `cases.pipeline_error` landen und in der UI als rote Draft-Stage erscheinen (kein stiller Leerlauf mehr).

## Out of Scope

- Prompt-Inhalte (Soft/Neutral/Hard-Stil) — unverändert, du hattest sie zuletzt gerade neu kalibriert.
- UI/Design.
- `match_knowledge`-Tuning (separates Ticket).
- Persistenz von `tactical_principles` als eigene Spalte — wir hängen sie an `strategy` an, um ohne Migration auszukommen.

## Geänderte Dateien

- `supabase/functions/strategos-ai-router/pipelines/multiStage.ts` (Schemas, Validierung, Fallback, Token-Limit-Param)
- `supabase/functions/strategos-ai-router/providers/anthropic.ts` (`maxTokens` weiterleiten — bereits Param, nur Default-Check)
- `supabase/functions/strategos-ai-router/prompts.ts` (PROMPT_STRATEGY auf neue Feldnamen)
