# Plan: Prompt-Schärfung in der Pipeline

Ziel: Die KI soll Soft-First weiterhin als Default behalten, aber **kalkulierten wirtschaftlichen Druck** (mit künstlicher Deadline, Abhängigkeitshebel) klar von **emotionalem Schmerz** trennen und in solchen Situationen nicht defensiv/bedürftig agieren. Wissensquellen sollen B2B-scharf statt lehrbuchartig übersetzt werden.

Alle Änderungen passieren in **`supabase/functions/strategos-ai-router/prompts.ts`** — keine Logik-Änderungen am Router, kein UI-Eingriff.

## 1) ELITE_PERSONA — Anti-Bedürftigkeits-Regeln ergänzen

Ergänzungen am Persona-Block:

- Neue Regel **"Sovereignty over Empathy"**: Empathie ist Werkzeug, nicht Reflex. Wenn die Gegenseite kalkulierten wirtschaftlichen Druck ausübt (kein emotionaler Schmerz), signalisiert mitfühlende Sprache Verlustangst und kippt die Machtbalance.
- **Verbotsliste von Bedürftigkeits-Phrasen** (sprachunabhängig, mit deutschen Beispielen): "ich verstehe, dass das für Sie keine leichte Situation ist", "ich weiß, wie schwierig das ist", "selbstverständlich", "natürlich verstehe ich" als Eröffnung gegenüber Druck — explizit untersagt, wenn keine emotionale Notlage der Gegenseite vorliegt.
- **Pressure-Type-Unterscheidung** wird Teil der vier Punkte: emotional vs. kalkuliert-wirtschaftlich vs. gemischt.
- **Anti-Open-Question-Regel unter Deadline**: Offene Fragen per E-Mail an einen Gegner unter selbst gesetztem Zeitdruck geben ihm die Kontrolle zurück. Erlaubt sind dann nur: (a) kalibrierte Fragen, die den Druck zurückspiegeln, (b) konkrete Prozess-/Optionsangebote, (c) "No"-orientierte Fragen.

## 2) SOFT-FIRST-Prinzip präzisieren

Statt pauschal "Soft-First bei weak/balanced" wird das Prinzip um eine Ausnahme erweitert:

```text
SOFT-FIRST gilt NICHT als bedürftige Eröffnung. Soft = souverän-kooperativ, nicht weich.
Ausnahme: pressure_type = "calculated_economic" UND artifizielle Deadline
→ recommended_variant mindestens "neutral", auch bei weak position.
Soft-Variante bleibt verfügbar, aber neu kalibriert: sachlich-warm, ohne Verlustangst-Signale.
```

## 3) PROMPT_ANALYSIS — zwei neue Felder

Im JSON-Schema der Analyse-Stage ergänzen:

- `pressure_type`: `"emotional" | "calculated_economic" | "mixed" | "none"` — Klassifiziert die Druckart der Gegenseite.
- `dependency_risk`: `"low" | "medium" | "high"` — Erfasst Abhängigkeitshebel (z. B. Umsatzanteil eines Kunden, Single-Source-Lieferant).
- `counterparty_model` muss künstliche Deadlines, Anker und Abhängigkeitshebel explizit benennen.

## 4) PROMPT_STRATEGY — Entscheidungsregeln ergänzen

Neue Regeln zusätzlich zur bisherigen Logik:

```text
- pressure_type = "calculated_economic" AND künstliche Deadline
  → recommended_variant MINDESTENS "neutral", unabhängig von power_position.
  → Strategie MUSS einen Gegenzug zur Deadline enthalten
    (Reframe, Counter-Anchor, Prozess-Vorschlag oder bewusstes Time-Boxing).
- dependency_risk = "high"
  → Strategie MUSS in 1 Satz die mittel-/langfristige BATNA-Stärkung adressieren
    (Diversifikation), nicht nur den akuten Zug.
- Unter Deadline KEINE offenen Fragen per Asynchron-Medium an die Gegenseite.
  Stattdessen: kalibrierte Frage + konkretes Gegenangebot (z. B. zweistufige Option).
```

Im Strategie-Output zusätzlich:
- `tactical_principles`: 2–3 kurze Bullet-Sätze, die die gewählten Frameworks **B2B-scharf** und situationsspezifisch übersetzen (nicht Lehrbuchzitate, sondern operative Handlungsanweisungen für genau diesen Fall).

## 5) PROMPT_DRAFT — Variantenprofile neu kalibrieren

Die Variantenbeschreibungen werden umgeschrieben:

- **soft**: kooperativ-souverän. Tactical Empathy nur in Form von präzisem Labeling/Mirroring, NICHT als Mitgefühlsformel. Verbietet Bedürftigkeits-Phrasen explizit. Enthält immer mindestens einen konkreten Gegenzug — keine reinen Frage-E-Mails unter Deadline.
- **neutral**: faktisch-direkt, mit Counter-Anchor und Prozess-Vorschlag (z. B. "Mehrjahres-Commitment gegen reduzierten Effektivsatz", "Volumenstaffel statt linearem Rabatt"). Adressiert die Deadline aktiv, ohne sie zu bedienen.
- **hard**: kontrollierter Druck mit Gesichtswahrung — unverändert, aber mit Hinweis: nie als Reaktion auf rein emotionalen Druck einsetzen.

Zusätzlich im Draft-Schema:
- `forbidden_phrases_checked: true` als Selbstkontroll-Flag (zwingt das Modell zur expliziten Prüfung).

## 6) Mock-Response anpassen

`MOCK_RESPONSE` wird leicht angepasst, damit die neue Tonalität auch im Fallback sichtbar ist (kein "verständlich"-Reflex in der Soft-Variante).

---

## Out of Scope

- Keine Änderung an Router-Logik, Pipeline-Reihenfolge, Modellen, Wissensquellen-Retrieval.
- Keine UI-Änderungen.
- Keine Datenbank-Migration.

## Validierung

Nach Implementierung: Den genannten Beispielfall (15 %-Rabatt, 30 % Umsatzanteil, Deadline morgen Mittag) erneut durch die Pipeline schicken und prüfen, dass:
1. `pressure_type = "calculated_economic"`, `dependency_risk = "high"`.
2. `recommended_variant ≥ neutral`.
3. Soft-Variante enthält keinen "ich verstehe, dass …"-Eröffner und keine reine Fragen-Mail.
4. Strategie nennt explizit Counter-Anchor / Time-Box und einen BATNA-Diversifikationshinweis.
