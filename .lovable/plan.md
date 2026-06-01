
## Befund Fehleranalyse

Ich habe Edge-Function-Logs (`strategos-ai-router`, `strategos-suggest-refinements`, `ingest-knowledge-base`), Postgres-Logs und den Status des konkreten Falls `f336cdbb-…` geprüft:

- Der Fall wurde sauber bis `status = active`, `model_used = multi_stage_elite` durchgespielt.
- Alle HTTP-Aufrufe an die Edge Functions seit dem Pipeline-Start liefen mit **Status 200** durch.
- Es gibt im Zeitraum **keine Postgres-Fehler** (ERROR/FATAL/PANIC) und **keine 4xx/5xx-Antworten** der Functions.
- Auch im aktuellen Browser-Console-/Network-Snapshot tauchen keine Fehler zur Pipeline auf.

Das heißt: serverseitig ist der Lauf erfolgreich gewesen. Die Fehlermeldungen, die du gesehen hast, kommen sehr wahrscheinlich aus der **UI** (Toasts, Modals, Inline-Hinweise) und nicht aus einem echten Pipeline-Fehler — oder sie betreffen eine andere Aktion (z. B. Verfeinerungen, Anhänge-Upload, Cool-down). Ohne den genauen Wortlaut bzw. einen Screenshot kann ich nicht seriös sagen, welche Komponente sie ausgelöst hat.

**→ Bitte schick mir kurz**: Wortlaut der Fehlermeldung(en) oder Screenshot, und an welcher Stelle sie erschienen (während „Analyse läuft", nach Klick auf Verfeinern, beim Öffnen des Falls, …). Damit kann ich die Ursache präzise benennen und beheben.

## Geheimhaltung der Wissensquellen (Admin-only Anzeige)

Aktuell rendert `CaseChatView.tsx` den Block `KnowledgeSourcesBlock` (Buchtitel, Kapitel, Seite, Snippet) für **jeden** Nutzer, sobald `version.knowledge_sources` Einträge enthält. Das ist die Stelle, an der Pallanx-Wissen aktuell „durchsickert".

### Änderung

1. **Frontend — Sichtbarkeit auf Admin einschränken**
   - In `src/components/CaseChatView.tsx` `useUserRole()` einbinden und den `KnowledgeSourcesBlock` nur rendern, wenn `isAdmin === true`.
   - Sicherheitshinweis: Die Daten kommen weiterhin im API-Response zurück (sind also technisch im Netzwerk-Tab sichtbar). Echte Geheimhaltung erfordert Schritt 2. Schritt 1 entfernt die Anzeige für alle Nicht-Admins sofort.

2. **Backend — Wissensquellen nicht mehr an Nicht-Admins ausliefern**
   - `supabase/functions/strategos-ai-router/index.ts`: vor `return json({...result, ...})` und vor `persistInitialVersion(...)` prüfen, ob der eingeloggte User Admin ist (`user_roles`-Check via `has_role(userId, 'admin')`).
   - Wenn **nicht** Admin:
     - `knowledge_sources` aus dem Response-Payload entfernen.
     - In `case_versions` ebenfalls `knowledge_sources: null` speichern, damit beim späteren Reload nichts nachgereicht werden kann.
   - Das gleiche Stripping auch in `onStageComplete`/`writeStage` für die Analyse-Stage (dort wird `knowledge_sources` aktuell mitgeschrieben).
   - Optional: Auch in `strategos-restore-version` / `strategos-refinement` / Read-Pfaden (`useCaseVersions`) sicherstellen, dass Nicht-Admins kein `knowledge_sources` zurückbekommen. Da die Daten in der Tabelle liegen, ist sauberer Weg eine **RLS-Spaltenmaskierung** über eine View — Aufwand größer. Schlanke Variante: Hook `useCaseVersions` filtert `knowledge_sources` clientseitig raus, wenn nicht Admin (kosmetisch, wirkt aber konsistent mit Schritt 1).

3. **Bestehende Daten**
   - Optional: Für bereits gespeicherte `case_versions` von Nicht-Admin-Usern `knowledge_sources` per Migration auf `NULL` setzen, damit Altbestand nicht weiterhin im DB-Row liegt. Bestätige bitte, ob du das willst — sonst lasse ich Altdaten unverändert.

### Was sich für dich (Admin) nicht ändert
- Wenn du als Admin eingeloggt bist, siehst du `WISSENSQUELLEN · n` wie bisher inkl. Buchtitel, Kapitel, Seite und Snippet.

## Technische Details

- Admin-Erkennung im Frontend: `useUserRole()` (existiert bereits, nutzt `user_roles` + Client-Query).
- Admin-Erkennung im Edge-Function-Backend: `serviceClient.rpc('has_role', { _user_id: userId, _role: 'admin' })` (SECURITY DEFINER, existiert).
- Betroffene Dateien:
  - `src/components/CaseChatView.tsx` (Render-Gate)
  - `supabase/functions/strategos-ai-router/index.ts` (Response- und Persistenz-Stripping)
  - optional `src/hooks/useCaseVersions.ts` (clientseitiger Filter)
  - optional Migration zum Bereinigen historischer `knowledge_sources` bei Nicht-Admin-Cases

## Offene Frage an dich

1. Schick mir bitte die konkreten Fehlermeldungen / Screenshots — dann ergänze ich hier die Ursachenanalyse und Fix-Schritte, bevor wir bauen.
2. Soll ich Altbestand `knowledge_sources` für Nicht-Admin-User per Migration auf NULL setzen, oder nur ab jetzt strippen?
