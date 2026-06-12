## Ziel
Alle KI-Funktionen ausschließlich auf **`claude-sonnet-4-5`** umstellen — auf allen Tiers (Free, Single, Pro, Elite). Embeddings bleiben `google/gemini-embedding-001` (Anthropic bietet keine Embeddings). Elite-Pipeline wird ein **Single-Call mit kombinierter Antwort** (Analyse + Strategie + Draft in einem strukturierten JSON-Output).

## Änderungen

### 1. DB-Migration: `plans`-Tabelle
- `free.model_id` → `claude-sonnet-4-5`
- `single_case.model_id` → `claude-sonnet-4-5`
- `pro.model_id` → `claude-sonnet-4-5`
- `elite.model_id` → `claude-sonnet-4-5` (war `gpt-5`)
- `elite.pipeline_config` → neuer Typ `combined_sections` (ein Call, drei Sections)

### 2. Edge Functions – Model-Konstanten auf Sonnet 4.5
- `strategos-ai-router`
- `strategos-upgrade-preview`
- `strategos-suggest-refinements`
- `strategos-refinement`
- `retail-shield-pipeline`
- alle weiteren Stellen mit hartkodiertem Gemini/GPT-Default

Embeddings (`google/gemini-embedding-001`) unverändert.

### 3. Neue Pipeline `combinedSections.ts`
- **Ein** Claude-Aufruf via Tool-Use / JSON-Schema, Output:
  ```json
  { "analysis": "...", "strategy": "...", "draft": "..." }
  ```
- Frontend-kompatibel: Stages werden nacheinander emittiert (`onStageComplete("analysis" → "strategy" → "draft")`).
- Default bei `pipeline_config.type === "combined_sections"`.
- `multiStage.ts` und `singleCall.ts` bleiben als Fallback.

### 4. Provider-Cleanup
- `providers/openai.ts` und `providers/gemini.ts` bleiben (Embeddings + Backward Compat), werden aber von Default-Pipelines nicht mehr aufgerufen.
- `OPENAI_API_KEY` bleibt als Secret, ungenutzt.

### 5. Sichtbarkeit
- `business_case_logs.model_used` und `cases.model_used` enthalten künftig immer `claude-sonnet-4-5`.
- Admin „AI Usage" zeigt damit nur noch Claude Sonnet 4.5.

## Kosten (geschätzt pro „Pipeline starten")
| Tier | Vorher | Nachher |
|---|---|---|
| Free | < $0,001 | **~$0,04 – $0,06** |
| Single / Pro | ~$0,04 – $0,06 | ~$0,04 – $0,06 |
| Elite | ~$0,08 – $0,12 (3 Calls) | **~$0,04 – $0,06** (1 Call) |

Abrechnung über `ANTHROPIC_API_KEY`, nicht über Lovable-AI-Credits. Free wird spürbar teurer pro Case.

## Nicht im Scope
- Embedding-Provider-Wechsel
- Lovable Editor AI
- Preisseiten / UI-Texte
