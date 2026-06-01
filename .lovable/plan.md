# Plan

## Was ich gefunden habe
- Das Backend selbst wirkt gesund; die hängende Indexierung kommt aktuell nicht von einem allgemeinen Backend-Ausfall.
- Beim betroffenen Buch `kahneman_fast_slow` steht der Datensatz auf `indexing`, aber es existieren **0 Chunks** in `knowledge_chunks`.
- In den Logs der Function gibt es für diesen Lauf praktisch keine eigentliche Verarbeitungsaktivität. Das spricht dafür, dass der Prozess **vor dem Seed/Embed-Schritt** hängen bleibt oder abbricht.
- Die gemeldeten `devserver_websocket_error`- und `/_sandbox/dev-server 404`-Meldungen sind sehr wahrscheinlich **Preview-/Hot-Reload-Signale** und nicht die eigentliche Ursache der Fachlogik. Ich werde sie nicht als Root Cause behandeln.

## Umsetzung
1. **Indexierungs-Flow im Admin-Frontend robuster machen**
   - Den Start-Flow in klaren Phasen führen: `Extrahiere PDF`, `Sende Chunks`, `Erzeuge Embeddings`, `Fertig`.
   - Solange noch keine Chunks in der DB sind, nicht mehr nur „Warte auf Chunks…“ zeigen, sondern die echte Vorphase im Browser sichtbar machen.
   - Beim Retry alte Fehlermeldungen und hängende Zustände zuverlässig zurücksetzen.

2. **Fehler beim clientseitigen PDF-Extract sauber abfangen**
   - `extractKnowledgeChunksFromPdf()` und den gesamten Upload-/Seed-Ablauf mit harter Fehlerbehandlung absichern.
   - Wenn die Extraktion fehlschlägt, zu lange hängt oder 0 verwertbare Inhalte liefert, den Buchstatus aktiv auf `error` setzen statt auf `indexing` stehen zu lassen.
   - Eine verständliche Fehlermeldung pro Buch speichern und im UI anzeigen.

3. **Fortschritt und Heartbeat serverseitig verlässlich machen**
   - Die Buch-/Indexierungsdaten um echte Laufzeitinformationen ergänzen, damit der Status nicht nur aus vorhandenen Chunks abgeleitet wird.
   - Geplante Felder: aktuelle Phase, verarbeitete/gesamte Einheiten, letzter Heartbeat, Fehlerstufe.
   - So kann das UI unterscheiden zwischen „extrahiert gerade“, „Seed läuft“, „Embedding läuft“, „steckt fest“, „fehlgeschlagen“.

4. **Stall-/Timeout-Erkennung einbauen**
   - Wenn ein Buch auf `indexing` steht, aber über eine definierte Zeit weder Heartbeat noch Fortschritt bekommt, automatisch als Fehler markieren.
   - Im UI dazu klare Aktion anbieten: `Erneut starten` statt nur einen scheinbar laufenden Zustand anzuzeigen.

5. **Edge Function gegen stille Hänger härten**
   - Die Function so anpassen, dass jede Phase ihren Status zurückmeldet und Fehler mit Stufe/Grund persistiert.
   - Beim Embed-Fortsetzen die nächste Ausführung nur dann planen, wenn es wirklich noch offene Chunks gibt.
   - Bei Fehlern keine stillen Zwischenzustände hinterlassen.

6. **UI für Kontrolle und Recovery verbessern**
   - Fortschrittsanzeige pro Buch mit echter Phasenbeschreibung plus Prozent/Rest.
   - Deutliche Zustände für `läuft`, `wartet`, `steckt fest`, `fehlgeschlagen`, `abgebrochen`.
   - Aktionen passend zum Zustand: `Abbrechen`, `Neu starten`, `PDF ersetzen`, `Löschen`.

## Technische Details
- **Frontend-Datei:** `src/pages/AdminKnowledge.tsx`
  - Start-Flow umbauen, lokale Phasen anzeigen, Retry-/Error-Reset ergänzen.
- **PDF-Extraktion:** `src/lib/knowledgeChunking.ts`
  - Robustere Fehlerbehandlung, Schutz gegen Hänger/leer extrahierte PDFs.
- **Edge Function:** `supabase/functions/ingest-knowledge-base/index.ts`
  - Status-/Heartbeat-Updates, bessere Fehlerpersistenz, saubere Folgeläufe.
- **Datenbank:** neue Migration für zusätzliche Status-/Progress-Felder auf `knowledge_books` oder eine dedizierte Job-Status-Struktur.

## Ergebnis nach dem Fix
- Ein Klick auf `Indexieren` zeigt sofort eine sinnvolle Phase statt dauerhaft `0%`.
- Wenn die PDF-Extraktion oder das Seeding scheitert, bleibt das Buch nicht mehr endlos auf `indexing`.
- Hängende Jobs werden als Fehler erkennbar und können sauber neu gestartet oder abgebrochen werden.
- Die Preview-WebSocket-Fehler werden von der eigentlichen Indexierungsdiagnose entkoppelt.