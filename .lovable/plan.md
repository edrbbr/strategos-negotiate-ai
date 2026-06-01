# Analyse: Warum die Pipeline bei „strategy" abbricht

## Symptom
- Analyse läuft komplett durch und wird im Case persistiert (rechts sichtbar).
- Strategy bleibt „Unterbrochen / Stage abgebrochen".
- Toast: **„Pipeline-Fehler: Failed to send a request to the Edge Function"**.

## Root Cause
Edge-Function-Logs zeigen: `Http: connection closed before message completed`. Das ist kein Modell-Fehler — die Edge-Function wurde **mitten in der Bearbeitung abgeschnitten**, weil das Wall-/CPU-Limit der Edge-Runtime erreicht wurde.

Konkret in `strategos-ai-router`:
1. **Alles läuft synchron in EINEM Request**: Analyse (Anthropic, ~30–60s) → Strategy (OpenAI gpt-5 Reasoning, bis zu 90s + bis zu 4 Retries bei 429/5xx) → Draft (Anthropic).
2. `providers/openai.ts`: `TIMEOUT_MS = 90_000`, `maxRetries = 4`. Worst-Case allein für Strategy = mehrere Minuten.
3. Die neuen, deutlich umfangreicheren Prompts (`prompts.ts` nach der Sovereignty-Überarbeitung) erhöhen Input-/Reasoning-Last → Strategy-Stage tendenziell langsamer.
4. Edge-Runtime kappt die HTTP-Verbindung deutlich vor 150 s realer Antwortzeit → Frontend bekommt „Failed to send a request". Die Strategy-Stage hatte noch nicht ins DB geschrieben, also bleibt sie im UI auf „running" und kippt dann via Catch auf „failed".

Sekundärer Befund in den Logs: `match_knowledge failed canceling statement due to statement timeout` (pgvector RPC) — wird im RAG-Pfad bereits sauber geschluckt (leere Sources), ist also nur ein Hinweis, kein Auslöser.

## Lösung — Pipeline in den Hintergrund verlagern

Kernidee: Die HTTP-Antwort an den Client darf **nicht** an den langsamsten Modellaufruf gekoppelt sein. Stattdessen:

1. Router startet die Pipeline in `EdgeRuntime.waitUntil(...)`, schreibt Stages weiterhin per `writeStage` in `cases` (passiert bereits) und antwortet sofort mit `{ status: "started", case_id }`.
2. Frontend zeigt die Stages live an, indem es per **Realtime auf die `cases`-Zeile subscribed** (mit Polling-Fallback, wie heute schon im `waitForVersionRecovery`-Pfad vorhanden).
3. Fehler einer Stage werden als strukturiertes Feld (`pipeline_error`) in `cases` gespeichert, damit das UI „Stage abgebrochen + Grund" auch ohne offene HTTP-Verbindung anzeigen kann.

## Umsetzung

### 1) DB-Migration — Fehlerzustand pro Case persistieren
Neue Migration:
- `ALTER TABLE public.cases ADD COLUMN pipeline_error jsonb;`
  Form: `{ stage: 'analysis'|'strategy'|'draft', code, message, at }`.
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;` (falls noch nicht aktiv) und `ALTER TABLE public.cases REPLICA IDENTITY FULL;` damit Updates pro Stage als Realtime-Event ankommen.

Keine RLS-Änderungen nötig (bestehende Policies decken `cases` ab).

### 2) `supabase/functions/strategos-ai-router/index.ts` — Background-Run
- Multi-Stage-Branch: bisherigen `await runMultiStagePipeline(...)`-Block in eine async-Funktion `runInBackground()` extrahieren.
- `EdgeRuntime.waitUntil(runInBackground())` aufrufen.
- **Sofort** `return json({ status: "started", case_id, plan: plan.id, cases_used: cases_used_after, case_limit: plan.case_limit, pipeline_meta: { type: "multi_stage", stages: [] } }, 202);`.
- In `runInBackground`:
  - `writeStage` wie heute pro Stage (Analyse/Strategy/Draft).
  - Bei Erfolg: `persistInitialVersion` + `cases.pipeline_error = null`.
  - Bei `StageFailure`: `cases.pipeline_error = { stage, code, message, at }`, **keine** Ausnahme nach oben (Connection ist eh zu).
  - `consume_dossier` bleibt am Anfang (Quota wird schon vor dem Start gezählt — Verhalten unverändert).
- Single-Call-Branch (Free/Pro) bleibt synchron (läuft in <60s, kein Problem).

### 3) Per-Stage-Härtung gegen Worst-Case
In `providers/openai.ts`:
- `TIMEOUT_MS` von 90 → 60 s.
- `maxRetries` von 4 → 2.
- Bei `TIMEOUT` als ProviderError mit `code: "TIMEOUT"` werfen — wird im Multi-Stage bereits sauber als StageFailure persistiert.

In `pipelines/multiStage.ts`:
- Bereits vorhandener Gemini-Fallback bei OpenAI `RATE_LIMIT` zusätzlich auf `TIMEOUT` triggern (1 Versuch, dann fail).

### 4) `src/pages/CaseDetail.tsx` — Realtime + Status-Quelle
- Nach `supabase.functions.invoke(...)`: wenn die Antwort `{ status: "started" }` enthält, **nicht** auf das Response-Payload für die Stages warten.
- Realtime-Subscription auf `cases:id=eq.{activeCaseId}` öffnen (UPDATE-Events). Bei jedem Update:
  - `analysis` befüllt → `analysis: "complete"`, `strategy: "running"`.
  - `strategy` befüllt → `strategy: "complete"`, `draft: "running"`.
  - `draft`/`current_version_id` befüllt → alle drei `"complete"`, `refreshProfile()`, Success-Toast.
  - `pipeline_error` befüllt → entsprechende Stage `"failed"`, Toast mit `pipeline_error.message`.
- Watchdog: nach 4 min ohne Endzustand → `pipeline_error` aus DB nachladen und ggf. Timeout-Toast.
- Bestehender `waitForVersionRecovery`-Fallback bleibt für ältere Cases / Offline-Tab.

### 5) Validierung
- Denselben Fall (15 % Rabatt, 30 % Umsatz, 3-Tages-Deadline) erneut starten.
- Erwartung: HTTP-Antwort kommt in <2 s, Stages werden live nacheinander grün, **kein** „Failed to send a request" mehr — auch wenn Strategy 90 s+ braucht.
- Negativtest: OpenAI-Key vorübergehend invalid setzen → `pipeline_error` mit `stage: "strategy"` erscheint im UI.

## Out of Scope
- Keine Änderung an Prompts (`prompts.ts`), Wissensquellen-Retrieval oder UI-Design.
- Kein neues Jobs-Table: `cases` selbst ist Single Source of Truth (vermeidet zusätzlichen Migrations-Footprint).
- Single-Call-Pipeline (Free/Pro) unverändert.
