# Plan: PDF-Indexierung hängt bei „PDF wird gelesen“ beheben

## Was ich festgestellt habe
- Das gehostete Backend wirkt gesund; das Problem ist nicht ein genereller Backend-Ausfall.
- Für `the_psychology_of_persuasion` steht der Datensatz auf `indexing` mit `progress_phase = extracting_pdf`, aber es gibt **0 Chunks** in der Datenbank.
- Für `kahneman_fast_slow` steht der Datensatz bereits wieder auf `uploaded`, ebenfalls mit **0 Chunks**.
- In den Function-Logs von `ingest-knowledge-base` sieht man für diese Versuche praktisch **keine eigentliche Verarbeitungsaktivität**. Das heißt: Der Lauf bleibt sehr wahrscheinlich **vor dem ersten Seed-Request** hängen.
- Die aktuelle Implementierung liest und zerlegt die PDF im **Admin-Browser**. Wenn `pdfjs-dist/webpack.mjs` bei bestimmten PDFs hängenbleibt oder extrem langsam wird, bleibt die UI auf „PDF wird gelesen“ stehen, ohne dass der Backend-Worker überhaupt startet.

## Umsetzung
1. **PDF-Extraktion aus dem Browser herauslösen**
   - Die Extraktion der PDF nicht mehr im Admin-Frontend ausführen.
   - Stattdessen die PDF im Backend aus dem Storage laden und dort mit einer Deno-kompatiblen PDF-Extraktion verarbeiten.
   - Danach Chunks direkt serverseitig erzeugen und speichern, damit der Flow nicht mehr vom Browser-Tab abhängt.

2. **Indexierungs-Function in echte Phasen aufteilen**
   - `download_pdf` → `extract_text` → `chunking` → `embedding` → `done`
   - Jede Phase schreibt laufend Fortschritt und Heartbeats in `knowledge_books`.
   - Die UI zeigt dann echten Server-Fortschritt statt nur einen lokalen Platzhalter.

3. **Harte Fehler- und Timeout-Behandlung einbauen**
   - Zeitlimit pro Extraktionsphase.
   - Wenn aus der PDF kein Text extrahiert werden kann oder die Extraktion hängenbleibt, wird der Buchstatus aktiv auf `error` gesetzt.
   - Zusätzlich wird die Fehlerstufe gespeichert, damit klar ist, ob das Problem bei Download, PDF-Parsing, Chunking oder Embedding lag.

4. **Abbrechen/Neustarten robust machen**
   - Beim Abbrechen werden Fortschritt, Fehlermeldung und eventuell angelegte Chunks konsistent zurückgesetzt.
   - Ein Neustart beginnt immer aus einem sauberen Zustand und überschreibt alte Hänger zuverlässig.

5. **Admin-UI an den serverseitigen Flow anpassen**
   - „Indexieren“ startet nur noch den Backend-Job.
   - Fortschrittsanzeige liest ausschließlich die Phasen-/Zählerdaten aus `knowledge_books`.
   - Bei Fehlern erscheint eine klare Meldung mit passender Aktion: erneut starten oder abbrechen.

6. **Betroffene Bücher direkt reparieren**
   - Nach dem Umbau die beiden Bücher `kahneman_fast_slow` und `the_psychology_of_persuasion` mit dem neuen Flow erneut anstoßen.
   - Prüfen, ob Chunks angelegt werden, der Embedding-Schritt läuft und der Status auf `ready` wechselt.

## Technische Details
- **Frontend:** `src/pages/AdminKnowledge.tsx`
  - Browser-seitige PDF-Zerlegung entfernen
  - Statusanzeige auf reine Backend-Phasen umstellen
- **Backend Function:** `supabase/functions/ingest-knowledge-base/index.ts`
  - PDF aus Storage laden
  - serverseitig Text extrahieren
  - Chunks erzeugen, speichern und Embeddings fortsetzen
- **Datenmodell:** `knowledge_books`
  - vorhandene Progress-Felder weiterverwenden
  - optional um Fehlerstufe/Job-Metadaten ergänzen, falls für Diagnose sinnvoll

## Ergebnis
- Die Indexierung bleibt nicht mehr stumm bei „PDF wird gelesen“ hängen.
- Auch problematische PDFs laufen entweder durch oder enden sauber mit verwertbarer Fehlermeldung.
- Fortschritt, Abbruch und Neustart funktionieren verlässlich für weitere Bücher ebenfalls.