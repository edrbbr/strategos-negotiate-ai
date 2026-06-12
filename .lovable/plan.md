## Ziel
Im Admin-LinkedIn-Curator (`/admin/content`) folgende Erweiterungen:
1. **Titel** für den Post (separat editierbar).
2. **Refinement-Block**: Freitext-Anweisung an Claude, um Stil/Inhalt/Botschaft anzupassen.
3. **Post-URL** nach Veröffentlichung speichern und anzeigen.
4. **Roh-Situation** des Cases bereits vor Generierung sichtbar (nicht nur „Case + ID").
5. **Öffentliche Verlinkung** auf der Homepage zu veröffentlichten Posts.

## DB-Migration
`linkedin_pool` um Spalten erweitern:
- `post_title text` — Titel für den Post.
- `post_url text` — LinkedIn-URL nach Veröffentlichung.
- `refinement_history jsonb default '[]'::jsonb` — Audit-Log angewendeter Refinements.

Neue Policy: `SELECT` für `anon`/`authenticated` auf Zeilen mit `status = 'posted'` (für die öffentliche Liste auf der Homepage). Bestehende Admin-Policies bleiben.

## Edge Function — `linkedin-case-generator`
- **Initialgenerierung**: Tool-Schema/Prompt liefert zusätzlich `post_title` (kurz, sachlich, max ~80 Zeichen).
- **Neuer Modus `mode: "refine"`** mit Body `{ pool_id, refinement_instruction }`:
  - Lädt aktuellen Post + Titel + anonymisierte Felder.
  - Claude-Call (Sonnet 4.5, `callAnthropicTool`) mit Anweisung: bestehenden Post gemäss Instruktion umschreiben, Tonalität (ruhig, du-Form) und Anonymisierung wahren.
  - Tool-Schema: `{ post_title, post }`. Anonymisierte Situation/Outcome bleiben unverändert.
  - Append-Eintrag in `refinement_history` (`{ instruction, at, by }`).
- Modell und Provider bleiben Claude Sonnet 4.5.

## Frontend

### `src/pages/AdminContent.tsx`
- **Vor Generierung**: Anonymisierte Roh-Situation (max ~400 Zeichen, mit „mehr anzeigen") direkt unter dem Card-Header anzeigen. Quelle: `cases.situation_text` über zusätzlichen Join/Select (Service-Role-Edge-Helper oder direkte RLS-Erweiterung — bevorzugt: bestehende Admin-RLS auf `cases` deckt das ab; ansonsten kleine Edge-Function `linkedin-pool-list` für Admin-View mit eingebetteter Situation). Entscheidung: prüfen, ob Admin-Select auf `cases` möglich ist — falls ja, direkter Join via zweitem Query; falls nein, neue Admin-Edge-Function.
- **Nach Generierung**:
  - Titel-Anzeige mit Inline-Edit (Direkt-Update auf `post_title` ohne AI-Call für Tippfehler).
  - Refinement-Bereich: `<Textarea>` „Was soll am Post angepasst werden?" + Button „Verfeinern" → ruft `linkedin-case-generator` mit `mode: "refine"` auf.
  - Klappbare Liste „Bisherige Anpassungen" aus `refinement_history`.
  - „Titel + Post kopieren"-Button zusätzlich zum bestehenden „Post kopieren".
- **„Als gepostet markieren"** ersetzen durch Mini-Dialog: Eingabe der LinkedIn-Post-URL (Pflicht) → setzt `status='posted'`, `posted_at`, `post_url`. Bei bereits geposteten Einträgen: URL editierbar + „Auf LinkedIn öffnen"-Link.

### Öffentliche Posts-Seite
- Neue Route `/insights` (oder `/cases`, finale Benennung im Build): listet alle `linkedin_pool`-Einträge mit `status='posted'`, sortiert nach `posted_at desc`.
- Karten zeigen `post_title`, gekürzten `generated_post`, Datum, „Auf LinkedIn ansehen"-Link auf `post_url`.
- SEO: Title/Meta, JSON-LD `ItemList`.
- **Verlinkung auf Homepage** (`src/pages/Landing.tsx`): dezenter Abschnitt „Aus der Praxis" mit den 3 neuesten Posts + Link „Alle Insights ansehen" zur neuen Route. Auch im Footer (`PublicHeader`/Footer-Komponente) ein Link.

## Nicht im Scope
- Keine Änderungen am Tier-/Modell-Setup, Embeddings oder anderen Edge Functions.
- Kein automatisches Posten via LinkedIn-API (URL wird manuell hinterlegt).
- Keine Kommentare/Reaktionen auf der öffentlichen Seite.
