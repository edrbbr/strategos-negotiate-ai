

# Neuer-Fall-Flow komplett: DB, Anhänge, Sidebar aufgeräumt

## Was tatsächlich gebaut wird

### 1) Sidebar reduzieren
`AppSidebar` zeigt nur noch:
- Dashboard (`/app/dashboard`)
- Settings (`/app/settings`)

Entfernt werden die Einträge **Analyse**, **Strategie**, **Execution**, **History**. Die zugehörigen Routen (`/app/execution`, `/app/history`) und Page-Files (`Execution.tsx`, `History.tsx`) werden ebenfalls aus `App.tsx` entfernt — sie sind keine echten Features, sondern leere Platzhalter.

### 2) Neuer Fall ohne unsichtbare Vorab-Erstellung
`/app/case/new` legt **nicht mehr** sofort beim Mount einen leeren Fall an. Statt­dessen:
- Formular ist sofort aktiv und ausfüllbar
- Kein „Fall wird vorbereitet…“ Text mehr
- Erst beim Klick auf **Pipeline starten** wird der Fall in der DB angelegt, Anhänge hochgeladen und die Pipeline gestartet
- Danach Navigation auf `/app/case/<neueId>` und der Fall taucht im Dashboard auf (über `useAllCases`, ist bereits korrekt verkabelt — wir sorgen nur dafür, dass nach Erstellung `queryClient.invalidateQueries(["cases"])` läuft)

### 3) Medium auswählbar
Echtes Select mit Optionen:
- E-Mail
- Brief
- WhatsApp Nachricht
- SMS / Kurzmitteilung
- Telefonleitfaden
- Gesprächsnotiz

Default: E-Mail. Wert wird auf `cases.medium` gespeichert.

### 4) Sprache als suchbare Combobox
Filterbares Dropdown mit den gängigsten Sprachen:
Deutsch, Englisch, Türkisch, Französisch, Spanisch, Italienisch, Niederländisch, Polnisch, Arabisch, Portugiesisch, Russisch, Rumänisch, Griechisch, Chinesisch.

Default: Deutsch. Speicherung auf `cases.language_code` + `cases.language_label`.

### 5) Referenz-Dokumente: echter Upload mit Storage
- Klick auf die Dropzone öffnet System-Dateidialog
- Erlaubt: PDF, JPG, JPEG, PNG (max 10 MB pro Datei)
- Hochgeladene Dateien werden gelistet, mit Entfernen-Button
- **Free-Tier-Limit: 1 Datei**, Pro/Elite: bis 10 Dateien
- Dateien werden in einem privaten Storage-Bucket `case-attachments` unter `<user_id>/<case_id>/<filename>` gespeichert
- Pro Datei wird ein Eintrag in neuer Tabelle `case_attachments` angelegt

### 6) Pipeline-Button-Logik
Aktiv sobald:
- Situationsbeschreibung ≥ 10 Zeichen
- Medium gewählt
- Sprache gewählt
- Kein Lauf gerade aktiv

Bei deaktivierten Zustand erscheint die Begründung (z.B. „Bitte mindestens 10 Zeichen eingeben“). Kein „Fall wird vorbereitet“ mehr.

### 7) KI verarbeitet Medium, Sprache und Anhänge
Die Edge Function `strategos-ai-router` bekommt zusätzlich `medium`, `language_label` und Liste der Anhang-IDs übergeben. Prompts werden so erweitert:
- Analyse + Strategie werden in der gewählten Sprache zurückgegeben
- Finaler Entwurf wird im Stil/Format des gewählten Mediums verfasst (z.B. WhatsApp = kurz, locker, ohne förmliche Anrede; Brief = vollständige Briefform)
- Anhänge: PDFs werden serverseitig per `pdf-parse`-Light (oder einfach Text-Extraktion via Lovable AI Gemini multimodal) ausgelesen und als Zusatzkontext mitgegeben. Bilder (JPG/PNG) werden als multimodaler Input an Gemini übergeben für OCR/Bildbeschreibung. Nur Free behält die 1-Datei-Grenze.

## Datenbank-Änderungen

### Migration auf `cases`
Neue Spalten:
- `medium` text default `'email'`
- `language_code` text default `'de'`
- `language_label` text default `'Deutsch'`

### Neue Tabelle `case_attachments`
```text
id              uuid pk
case_id         uuid not null
user_id         uuid not null
file_path       text not null   -- Pfad im Bucket
file_name       text not null
mime_type       text
size_bytes      int
extracted_text  text            -- für PDF/Bild-OCR Kontext, nullable
created_at      timestamptz default now()
```
RLS: User sieht/managt nur eigene (`auth.uid() = user_id`).

### Storage-Bucket `case-attachments`
- Privat (nicht public)
- RLS-Policies auf `storage.objects`: User darf nur in den eigenen Pfad `<user_id>/...` lesen/schreiben/löschen

## Frontend-Anpassungen

- `src/pages/CaseDetail.tsx`: gesamte „auto-create-on-mount“-Logik entfernen, neuen Submit-Flow bauen, Medium-Select + Sprach-Combobox + File-Input einbauen
- `src/hooks/useCases.ts`: `useCreateCase` nimmt jetzt Eingabe-Payload entgegen (`{ situation_text, medium, language_code, language_label }`)
- Neuer Hook `src/hooks/useCaseAttachments.ts` für Upload/List/Delete
- `src/components/AppSidebar.tsx`: nav-items reduzieren
- `src/App.tsx`: Routen `execution`, `history` entfernen, Imports raus

## Backend-Anpassungen
- `supabase/functions/strategos-ai-router/index.ts`: Input erweitert um `medium`, `language_label`, `attachment_ids`. Lädt Attachments via Service Client, extrahiert Text (Gemini multimodal über Lovable AI für Bilder, simple PDF-Text-Extraktion für PDFs), hängt Kontext an die Prompts.
- `supabase/functions/strategos-ai-router/prompts.ts`: Prompts um Sprach-/Medium-Direktiven ergänzen.

## Akzeptanzkriterien
- Sidebar zeigt nur noch Dashboard + Settings
- Auf `/app/case/new` ist sofort alles ausfüllbar, kein „wird vorbereitet“
- Medium und Sprache sind wirklich auswählbar (Sprache mit Suche)
- Klick auf Referenz-Dokumente öffnet Dateidialog, Upload funktioniert
- Free: max 1 Datei, sonst Hinweis
- Pipeline-Button wird klickbar wenn Eingaben gültig sind
- Klick → Fall wird in `cases` angelegt, Anhänge in `case_attachments` und Storage, Pipeline läuft, Navigation zu `/app/case/<id>`
- Fall erscheint im Dashboard und in der „Aktive Fälle“-Liste der Sidebar
- KI-Antwort respektiert Sprache und Medium
- Anhang-Inhalte fließen als Kontext in die Analyse ein

## Was NICHT enthalten ist
- Keine Drag-and-drop-UX, nur Klick-Upload
- Keine Vorschau der hochgeladenen Dateien (nur Name + Entfernen-Button)
- Keine Dateiformate jenseits PDF/JPG/PNG
- Keine separate Detail-Seite für Anhänge

