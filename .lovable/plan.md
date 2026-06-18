## Erweitertes Bild

Du hast zwei verbundene Symptome gemeldet:

1. **Initial-Analyse schlägt mit `ERR_HTTP2_PROTOCOL_ERROR` ab** (Toast „AI-Analyse fehlgeschlagen / Failed to send a request to the Edge Function").
2. **Refinement (V2) läuft durch, liefert aber kein Kundenanschreiben** (`Wortlaut für den Kunden` und `E-Mail-Entwurf` fehlen, obwohl Analyse, Risiko, Begründung und Zugeständnis vorhanden sind).

Wichtig: Das sind **zwei verschiedene Probleme**, nicht eines.

- Das Frontend rendert `customer_wording` und `email_draft` korrekt — es zeigt die Blöcke nur dann nicht, wenn die KI leere Strings zurückgibt (siehe `RefinementChat.tsx`, Zeilen 352–373: `{shown.customer_wording && …}`).
- Schema-seitig sind beide Felder bereits als `required` markiert (`b2b-case-refine` Zeile 203, `retail-shield-pipeline` Zeile 209), aber JSON-Schema „required" verbietet leere Strings nicht. Claude darf also `""` liefern, vor allem wenn die Strategie „nichts anbieten / nur klären" lautet — das passt exakt zur V2 deines Falls.
- Im Initial-Pipeline-Run hat die Funktion vermutlich gar nicht durchgeschrieben (Timeout/Verbindungsabbruch), deshalb wurde dort gar kein V1-Wortlaut gespeichert.

Beide Symptome werden mit denselben drei Änderungen gelöst.

## Plan (aktualisiert)

### A) `supabase/functions/retail-shield-pipeline/index.ts` — Timeout-/Antwort-Stabilität

Wie zuvor besprochen, plus Pflicht-Wortlaut:

- `max_tokens` von 4500 auf 3500 senken.
- Sofort nach der Anthropic-Antwort nur den essentiellen `business_cases.update(...)` ausführen und die `Response` bauen.
- Trailing-Writes (V1-Snapshot in `business_case_versions`, `business_cases.current_version_id`, `business_case_logs`-Insert, optional `business_approvals`-Insert) in `EdgeRuntime.waitUntil((async () => { … })())` verlagern, damit die HTTP-Antwort zuerst rausgeht und der Runtime sie bis zum Ende laufen lässt.
- Im System-Prompt einen verpflichtenden Absatz ergänzen:
  „`customer_wording` und `email_draft` sind in JEDER Option PFLICHT und müssen vollständig ausformuliert sein — auch wenn `customer_concession_eur = 0` ist (Deeskalation + Vorschlag eines Begutachtungs-/Lösungs-Schritts). Leere oder einsilbige Felder sind unzulässig."
- Im Tool-Schema beider Felder `minLength: 60` für `customer_wording` und `minLength: 200` für `email_draft` setzen, damit constrained decoding das Auslassen aktiv verhindert.
- Server-seitiger Fallback nach der KI-Antwort: wenn trotzdem ein Feld leer/kürzer ist, einen leichten Nachschuss über `callAnthropicText` (Standard-Modell, ~700 Tokens) starten, der nur `customer_wording` + `email_draft` für die empfohlene Option formuliert, und das Ergebnis vor dem `business_cases.update`/V1-Snapshot in `recommended` (und `options[recIdx]`) einpatchen.

### B) `supabase/functions/b2b-case-refine/index.ts` — Refinement liefert IMMER ein Kundenanschreiben

- Im System-Prompt identischen Pflicht-Absatz ergänzen wie oben („`customer_wording`/`email_draft` sind Pflicht; bei 0-€-Strategie höflicher Deeskalations-Text + nächster konkreter Schritt wie Techniker-/Begutachtungs-Termin").
- Im Tool-Schema (`recommendation`) `minLength: 60` für `customer_wording` und `minLength: 200` für `email_draft`.
- Gleichen Fallback wie in (A) anhängen: wenn nach dem Tool-Call eines der beiden Felder leer/kürzer ist, ein zweiter, gezielter `callAnthropicText`-Aufruf produziert die fehlenden Texte und sie werden in `parsed.recommendation` (und damit in `business_case_versions.ai_options[0]`) eingepatcht, bevor die Version in die DB geht. Damit ist die V2 deines Falls reproduzierbar mit Anschreiben.
- Trailing-Writes (`business_case_logs`-Insert, optional `business_approvals`-Insert, evtl. `current_version_id`-Update) ebenfalls in `EdgeRuntime.waitUntil(...)` verlagern; nur der `business_case_versions.insert` und das `business_cases.update({ current_version_id, ai_options, suggested_offer, … })` müssen vor der Response laufen, weil das UI sie unmittelbar liest.

### C) `/select-context` Loader-Falle (unverändert aus dem Vorplan)

- `src/pages/Login.tsx`: nach erfolgreichem `signInWithEmail` mit `supabase.auth.getUser()` die User-ID holen und in zwei parallelen, lightweight Queries `profiles.b2c_enabled` + aktive `business_users`-Zeile prüfen. Direkter Redirect zu `/app/dashboard` (nur B2C) bzw. `/retail/app/dashboard` (nur B2B); nur bei beidem zu `/select-context`. Bestehender `fromParam`/`hasFirstCasePrefill()`-Vorrang bleibt.
- `src/pages/SelectContext.tsx`: Auto-Redirect aus dem Render in einen `useEffect` verschieben (reagiert auf jedes Update von `profile`/`membership`); nach ~1,5 s Wartezeit ohne Daten den Picker (mit deaktivierten Karten falls Entitlement unbekannt) plus „Abmelden"-Button rendern, damit niemand auf einem leeren Spinner hängen bleibt.

## Technische Details

- `EdgeRuntime.waitUntil` ist auf der Supabase Edge Runtime verfügbar; nutzt das Muster `EdgeRuntime.waitUntil((async () => { … })())` nach `new Response(...)` und vor `return`.
- Der Fallback-Nachschuss verwendet den vorhandenen `_shared/anthropic.ts#callAnthropicText` mit `max_tokens` ≈ 700 und Default-Timeout — addiert im Worst Case ~6–10 s und nur, wenn das Hauptergebnis lückenhaft war.
- Keine Migrationen, keine neuen Secrets, keine RLS-Änderungen.
- Geänderte Dateien: `supabase/functions/retail-shield-pipeline/index.ts`, `supabase/functions/b2b-case-refine/index.ts`, `src/pages/Login.tsx`, `src/pages/SelectContext.tsx`.

## Nicht im Scope

- Wechsel vom direkten Anthropic-Aufruf auf das Lovable AI Gateway (Qualitäts-/Tooling-Wechsel — separat besprechen).
- Inhaltliche Umarbeitung der Prompts jenseits der Pflicht-Klausel.
- Änderungen an `RetailLogin.tsx` (verwendet weiterhin den `/select-context`-Fallback, der nach (C) self-healing ist).
