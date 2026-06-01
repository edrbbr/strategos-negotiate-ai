# Plan: Hänger bei 868 / 934 Embeddings beheben

## Was ich bestätigt habe
- Das gehostete Backend ist grundsätzlich gesund.
- `the_psychology_of_persuasion` hängt aktuell bei:
  - Status: `indexing`
  - Phase: `embedding`
  - Fortschritt: `868 / 934`
  - Offene Embeddings: `66`
  - Keine gespeicherte Fehlermeldung
- `kahneman_fast_slow` steht derzeit wieder auf `uploaded` und wurde nicht neu gestartet.
- Für den Hänger gibt es keine verwertbare Fehlermeldung in den Function-Logs.

## Wahrscheinliche Ursache
Die Embedding-Kette läuft über interne Selbstaufrufe der Function. Wenn ein Folgeaufruf oder eine externe Embedding-Anfrage scheitert oder nicht mehr weiterläuft, bleibt der Datensatz einfach auf `indexing` stehen. Aktuell wird dieser Zustand nicht sauber in einen Fehler oder einen wiederaufnehmbaren Status überführt.

## Umsetzung
1. **Fortsetzung der Embedding-Jobs robust machen**
   - Den internen Folgeaufruf nicht mehr „fire-and-forget“ behandeln.
   - Antwortstatus und Fehler des Folgeaufrufs explizit prüfen.
   - Wenn die Fortsetzung nicht gestartet werden kann, den Buchstatus aktiv auf `error` setzen und die Ursache speichern.

2. **Embedding-Schritt fehlertolerant machen**
   - Pro Batch sauberes Logging ergänzen.
   - Fehler aus der Embedding-API, Update-Fehler einzelner Chunks und Zähl-/Statusfehler getrennt behandeln.
   - Wiederholbare Fehler in klare Fehlermeldungen übersetzen statt still hängen zu bleiben.

3. **Stall-Erkennung serverseitig absichern**
   - Nicht nur im UI warnen, sondern festhängende Jobs serverseitig als Fehler markieren oder für Wiederaufnahme kennzeichnen.
   - Damit bleibt kein Buch dauerhaft ohne Rückmeldung auf `indexing` stehen.

4. **Gezielte Wiederaufnahme statt kompletter Neuerstellung**
   - Einen Resume-/Retry-Pfad ergänzen, der bei vorhandenen Chunks nur die fehlenden Embeddings weiterverarbeitet.
   - So müssen bereits erzeugte 868 Embeddings nicht verworfen werden.

5. **Admin-UI klarer machen**
   - Bei festhängendem Embedding statt nur Warntext zusätzlich eine passende Aktion anzeigen: `Fortsetzen` oder `Neu starten`.
   - Fehlermeldungen aus dem Backend sichtbar machen, damit klar ist, ob der Hänger bei Fortsetzung, Embedding-API oder Datenbank lag.

6. **Stale Browser-PDF-Reste aufräumen**
   - Die übrig gebliebenen `pdf.worker`-/`knowledgeChunking`-Reste aus dem Frontend bereinigen, damit keine irreführenden Dev-Fehler mehr auftauchen.

7. **Betroffene Bücher reparieren und verifizieren**
   - `the_psychology_of_persuasion` über den neuen Resume-Pfad fertigstellen.
   - `kahneman_fast_slow` anschließend neu starten und prüfen, dass die Phasen sauber weiterlaufen.

## Technische Details
- **Frontend:** `src/pages/AdminKnowledge.tsx`
  - Stall-/Error-UI
  - Resume-/Retry-Action
  - klarere Statusdarstellung
- **Backend Function:** `supabase/functions/ingest-knowledge-base/index.ts`
  - robuste Continuation
  - explizite Fehlerpersistenz
  - Resume-Phase für offene Embeddings
- **Optionales Datenmodell:** nur falls nötig kleine Ergänzung für Fehlerstufe oder Retry-Zeitpunkt

## Ergebnis
- Kein Buch bleibt mehr kommentarlos bei 93% oder einem anderen Stand hängen.
- Bereits erzeugte Embeddings können fortgesetzt werden.
- Admin sieht sofort, ob ein Lauf aktiv ist, festhängt, neu gestartet wurde oder mit konkretem Fehler beendet wurde.