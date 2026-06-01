
# Pipeline-Upgrade: ELITE Negotiation Agent + RAG

Ziel: Pipeline-Qualität auf Niveau der ELITE-Instruction heben (4-Punkt-Analyse, Modus-Klassifikation, Soft-First-Eskalation, 3 Varianten) und mit RAG aus Voss/Greene/Malhotra/Fisher-Ury/Kahneman fundieren.

---

## 1. Datenbank-Schema (Migration)

### 1a. RAG-Infrastruktur
- Extension `vector` aktivieren.
- Storage-Bucket `knowledge-base` (privat) für Buch-PDFs.
- Tabelle `knowledge_books`:
  - `book_key` (PK), `title`, `author`, `file_path` (in Bucket), `chunk_count`, `indexed_at`, `status` (uploaded | indexing | ready | error)
- Tabelle `knowledge_chunks`:
  - `book_key` (FK), `chapter`, `page`, `content` (text), `embedding vector(3072)`, `created_at`
  - HNSW-Index auf `embedding vector_cosine_ops`.
- RLS: Admin (`has_role`) liest beides; `service_role` schreibt. Keine User-Zugriffe direkt.
- RPC `match_knowledge(query_embedding vector(3072), match_count int, filter_books text[] DEFAULT NULL)` → Top-K Passagen mit Buch+Kapitel-Metadaten.

### 1b. Cases-Erweiterung (Hybrid-Schema)
- `cases`:
  - `escalation_level` text default `'auto'` (auto | soft | neutral | hard)
  - `mode` text NULL (information | positioning | negotiation | closing | defensive)
  - `recommended_variant` text NULL (soft | neutral | hard)
  - `variants` jsonb NULL → `{ soft: string, neutral: string, hard: string }`
  - `clarifying_questions` jsonb NULL → string[] (max 3)
  - `plan_steps` jsonb NULL → string[]
  - `knowledge_sources` jsonb NULL → `[{ book_key, chapter, page, snippet }]`
- `case_versions`: dieselben neuen Spalten für Refinement-Historie.

---

## 2. Wizard / Frontend

### 2a. Neues Feld „Eskalationsstufe" (HeroCaseInput + CaseDetail Wizard)
Segmented Control mit vier Optionen:
- `Auto (empfohlen)` — KI entscheidet über Machtanalyse (Default; Soft-First wenn schwach/balanced, Neutral/Hart nur wenn Gegenüber aggressiv)
- `Weich` — kooperativ, beziehungswahrend
- `Neutral` — sachlich-bestimmt
- `Hart` — durchsetzungsstark

Wert wird in `cases.escalation_level` gespeichert und an Edge-Function übergeben.

### 2b. CaseDetail-Rendering (alle Tiers identisch)
- Neue Sektion **Modus** (Badge + Tooltip-Erklärung des Systemmodus).
- Neue Sektion **Umsetzungsplan** (nummerierte Liste aus `plan_steps`).
- Neue Sektion **Klärende Fragen** (nur wenn vorhanden, max 3).
- Tabs **Varianten** (Weich / Neutral / Hart), `recommended_variant` mit Gold-Chip „KI-Empfehlung". `draft` bleibt = Inhalt der empfohlenen Variante (Backwards-Kompat).
- Klappbare Sektion **Wissensquellen** mit Liste der retrievten Buch-Passagen (Buchtitel, Kapitel, Seite, kurzer Auszug).

---

## 3. RAG-Ingestion — Admin-UI

### 3a. Erweiterung `/admin` (neuer Tab „Wissensbasis")
- Upload-Zone (Drag & Drop, mehrere PDFs gleichzeitig) → schreibt in Bucket `knowledge-base` und Zeile in `knowledge_books`.
- Tabelle aller Bücher: Titel, Autor, Status, Chunk-Count, „Indexieren"-Button, „Neu indexieren"-Button, Löschen.
- Per-Buch-Editor für `book_key`, `title`, `author` (vor erstem Indexieren editierbar).

### 3b. Edge-Function `ingest-knowledge-base`
1. Lädt PDF aus Bucket.
2. Extrahiert Text seitenweise (PDF.js / `unpdf` über npm:-Specifier).
3. Chunkt in ~1000 Zeichen mit 200 Zeichen Overlap, behält `page` + naive `chapter`-Heuristik (erste Zeile in Caps oder „Chapter N").
4. Embeddet via Lovable AI Gateway `google/gemini-embedding-001` (3072 dims, Quality-First).
5. Schreibt Batch in `knowledge_chunks`, setzt `knowledge_books.status = 'ready'`.
6. Returnt Fortschritt; Frontend pollt via React Query.

### 3c. Voreingetragene Bücher (Seed)
Nach Migration legt der Admin sie an oder ich seede sie als leere Einträge:
- `voss_never_split` — Never Split the Difference (Chris Voss)
- `greene_48_laws` — 48 Laws of Power (Robert Greene)
- `malhotra_genius` — Negotiation Genius (Malhotra/Bazerman)
- `fisher_ury_yes` — Getting to Yes (Fisher/Ury)
- `kahneman_fast_slow` — Thinking, Fast and Slow (Kahneman)

Du lädst die PDFs anschließend in der neuen Admin-Oberfläche hoch und triggerst Indexierung.

---

## 4. Prompt-Engineering (`prompts.ts` — Neufassung)

### Geteilte Persona
„ELITE NEGOTIATION AGENT" — vier Verhaltenssäulen: interne 4-Punkt-Analyse, Modus-Zuordnung, Strategie-Engine, adaptives Verhalten (schwach→Zeit gewinnen/Info; stark→kontrollierter Druck; aggressives Gegenüber→Tempo drosseln/Kontrolle zurück). Kein Assistent — strategischer Vorteil.

### PROMPT_ANALYSIS (Stage 1, Claude)
Strukturiertes JSON:
- `goal_analysis` (Gesagtes vs. tatsächliches Ziel, kurz- vs. langfristig)
- `counterparty_model` (Absichten, Constraints, Zeitdruck, Verhaltenstyp)
- `power_analysis` mit `power_position: weak | balanced | strong` + `counterparty_aggression: low | medium | high`
- `risk_analysis` (Worst Case, Walk-away)
- `mode` (information | positioning | negotiation | closing | defensive)
- `clarifying_questions` (0–3, nur wenn kritische Info fehlt)
- `analysis` (3–5 Synthese-Bullets fürs UI)

### PROMPT_STRATEGY (Stage 2, GPT-5)
- Input: Analyse + retrievte Buch-Passagen (`knowledge_context`) + `escalation_level`.
- Wählt Framework mit Quellenzitat: „Voss — Labeling", „Fisher/Ury — Interest-based", „Greene — Law 33", „Kahneman — Loss Aversion", etc.
- Liefert `recommended_escalation: soft | neutral | hard`:
  - `weak` ODER `balanced` → `soft` (Soft-First-Default)
  - `strong` UND `counterparty_aggression ≥ medium` → `neutral` oder `hard`
  - Sonst → `soft` als kooperativer Opener
  - Wenn User `escalation_level ≠ auto` → Override, KI dokumentiert Abweichung im Strategie-Text.

### PROMPT_DRAFT (Stage 3, Claude)
- Erzeugt IMMER drei Varianten: `soft`, `neutral`, `hard`.
  - `soft`: kooperativ, Tactical Empathy (Voss: Labeling, Mirroring, „No"-orientierte Fragen), beziehungswahrend
  - `neutral`: sachlich-direkt mit klarem Anker (Fisher/Ury, Anchoring)
  - `hard`: Loss Aversion, kontrollierter Druck, immer Brücke zum Gesichtwahren
- Setzt `recommended_variant`; `draft` (Hauptfeld) = Inhalt davon.
- Liefert zusätzlich `plan_steps` (3–5 nächste Schritte) und `mode`.

### Tier-Gating
Alle Tiers sehen alle drei Varianten + Plan + Fragen (keine Unterscheidung). Bestehende Tier-Gates (Anhänge, Tonalität, Deep-Doc) bleiben.

---

## 5. Pipeline-Code

### `pipelines/multiStage.ts` + `singleCall.ts`
- Vor Stage 1: Helper `retrieveKnowledge(situationText, attachmentsContext)` → Query-Embedding via Lovable AI → `match_knowledge(top_k=8)` → Formatiert als Kontext-Block, parallel als `knowledge_sources`-Metadata für DB.
- Erweiterte Tool-Schemata für neue JSON-Felder.
- Stage-Outputs auf neue DB-Spalten gemappt (`mode`, `variants`, `plan_steps`, `clarifying_questions`, `recommended_variant`, `knowledge_sources`).
- `escalation_level` aus DB an Strategy-Prompt durchreichen.

### `strategos-refinement` Edge-Function
Analog: Refinement darf Varianten neu generieren und Eskalationsstufe wechseln.

---

## 6. Reihenfolge der Umsetzung

1. Migration: `knowledge_books`, `knowledge_chunks`, RPC, Storage-Bucket, Cases-Erweiterung
2. Admin-UI „Wissensbasis": Upload + Tabelle + Indexieren-Button
3. Edge-Function `ingest-knowledge-base` (PDF-Parsing + Embedding-Pipeline)
4. Du lädst PDFs hoch + triggerst Indexierung
5. `prompts.ts` Neufassung
6. Pipeline-Code: RAG-Retrieval + neue Felder
7. Wizard-Feld „Eskalationsstufe" (Hero + CaseDetail)
8. CaseDetail-Rendering (Modus, Plan, Fragen, Varianten-Tabs, Quellen)
9. `strategos-refinement` anpassen
10. End-to-End-Test mit echtem Fall, Prompt-Kalibrierung
