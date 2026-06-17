## Auftrag 1 — Analyse-Bericht der Retail-Shield-KI

### 1. Steuerungsstellen (vollständige Karte)

| # | Datei | Funktion |
|---|---|---|
| A | `supabase/functions/retail-shield-pipeline/index.ts` | **Erstanalyse-KI** — erzeugt die initiale Empfehlung (V1) für einen Retail-Case. Lädt `business_cases`, `business_settings.max_discount_limits` + `kulanz_rules`, Branche (`industries.ai_context`), Custom-Rollen, RAG (`match_business_knowledge` + `match_knowledge`) und ruft Claude Sonnet 4.5 mit forced tool use auf. Schreibt V1 in `business_case_versions`. |
| B | `supabase/functions/b2b-case-refine/index.ts` | **Refinement-KI** für Retail-Cases (trotz `b2b-`-Präfix wird sie aus dem Retail-Refinement-Chat aufgerufen). Erzeugt iterative Versionen V2…Vn in `business_case_versions` mit `kind: "refinement"`. |
| C | `src/components/retail/case/RefinementChat.tsx` | UI für den Verhandlungs-Chat — sendet aktuell nur `{ case_id, instruction }`. Kein separates Feld für "Kundenreaktion". |
| D | `supabase/functions/_shared/anthropic.ts` | Claude-Wrapper (Sonnet 4.5, tool-use). |
| E | RAG / Limits | `business_settings.max_discount_limits`, `business_settings.kulanz_rules`, `business_custom_roles`, `industries.ai_context`, `match_business_knowledge` (mandantenspezifisch), `match_knowledge` (global). |
| — | NICHT betroffen | `strategos-*` (das ist B2C-Pallanx), `strategos-refinement`, `prompts.ts`. Diese werden im Auftrag ausdrücklich ausgeschlossen. |

Hinweis: Es gibt im Retail-Pfad **kein** zusätzliches `prompts.ts`; die System-Prompts stehen inline in den beiden Edge-Functions A und B.

### 2. Wörtliche Stellen, die zu schnell Richtung Kulanz/Zahlung treiben

**Aus `retail-shield-pipeline/index.ts` (System-Prompt, Z. 101–131):**

- > "Du bist Pallanx Retail Shield — ein AI-Verhandlungsassistent für rechtssichere und **FAIRE** Reklamationsbearbeitung im Einzelhandel."
- > "Liefere GENAU EINE Empfehlung — den kleinstmöglichen Betrag, mit dem **der Kunde sich noch als Gewinner fühlt**."
- > Tool-Schema-Beschreibung: `"Return the single **fair** Retail-Shield recommendation"` und User-Prompt: `"Erzeuge eine EINZIGE **faire** Empfehlung"`.
- > `customer_wording`: "Konkreter, **höflicher, fairer** Wortlaut" — Tonalität: `"rechtssicher und fair"`.

Wirkung: Das Wort "fair" + "Kunde als Gewinner" framt die KI von Anfang an als neutralen Schiedsrichter, nicht als Händler-Anwalt. "Kleinstmöglicher Betrag, mit dem der Kunde sich als Gewinner fühlt" enthält bereits die Prämisse, dass gezahlt wird — der rhetorische Hebel, den Kunden zur **kostenlosen** Reparatur/Nacherfüllung zu führen, fehlt komplett.

**Aus `b2b-case-refine/index.ts` (System-Prompt, Z. ~120):**

- > "Du bist Pallanx Retail Shield. Du verfeinerst die bestehende EINZIGE Empfehlung gemäß Anweisung des Mitarbeitenden. … **Faire, rechtssichere, branchenrealistische Verhandlung.**"

Keine Verankerung von Anchoring, Reziprozität, deeskalierender Empathie, kein "in kleinen Schritten nachgeben mit Gegenwert". Die Logik im Tool-Schema fordert nur `recommendation.amount_eur` — also wieder einen **Betrag**, nicht eine Rhetorik-Linie.

### 3. Wie die Lösungsoptionen aktuell erzeugt werden

Trotz UI-Sprache "drei Optionen" liefert das Tool-Schema in beiden Functions **genau EINE Option**:

```
recommendation: { amount_eur, percent_of_purchase, rationale, customer_wording, email_draft, required_role, confidence }
```

`options = [recommendation]` (Pipeline Z. 185, Refine Z. 154). Es gibt also faktisch keine Staffelung "Optimal / Ausgewogen / Beziehungsschutz". Die einzige Achse ist `amount_eur` — eine Geld-Achse, keine Strategie-Achse.

### 4. Refinement-Kontext (Kernpunkt)

Was die Refinement-KI **bekommt** (Z. 96–115 in `b2b-case-refine/index.ts`):

- ✅ Ursprungs-Case-Stamm (`business_cases.*`): Produkt, Preis, Kundenforderung, `situation_text`, `notes`.
- ✅ Branche + `industries.ai_context`.
- ✅ Limits + `kulanz_rules`.
- ✅ RAG-Re-Query mit der neuen `instruction`.
- ⚠️ **Nur die letzte Version** (`business_case_versions` → highest `version_number`) als `VORHERIGE ANALYSE` + `VORHERIGE EMPFEHLUNG`.
- ❌ **Keine vollständige Versionshistorie** V1…Vn-1 (was wurde zuvor schon angeboten/abgelehnt).
- ❌ **Kein strukturiertes Feld "Kundenreaktion"** — die UI (`RefinementChat.tsx` Z. 30) sendet nur einen Freitext `instruction`. Mitarbeitende müssen die Kundenreaktion in dieselbe Box schreiben, vermischt mit ihrer Anweisung. Die KI hat keinen klaren Unterschied "was der Kunde sagte" vs. "was der Mitarbeitende will".
- ❌ **Kein expliziter Log "bereits an Kunde gesendete Angebote/Texte"** — `customer_wording`/`email_draft` der vorherigen Runde sind nur indirekt in `VORHERIGE EMPFEHLUNG` enthalten, aber ohne Kennzeichnung "wurde tatsächlich rausgeschickt" vs. "war nur Vorschlag".
- ❌ **Kein Verhandlungs-State** (z. B. "Runde 3, bisheriges Maximalangebot 50 €, Kunde fordert 300 €, lehnt Reparatur ab"). Die KI muss das jede Runde aus dem Rohtext rekonstruieren — Ergebnis: sie verhandelt im Kreis und kann nicht "in kleinen Schritten mit Gegenwert" eskalieren.
- ❌ **Keine Trennung Auslöser A (rechtlich) vs. Auslöser B (wirtschaftlich)** im System-Prompt — und kein Output-Feld, das einen Abbruch-/Abschluss-Vorschlag explizit als "Geschäftsentscheidung zur Freigabe" markieren würde.

### 5. Befund in einem Satz

Die Retail-KI ist heute prompt-seitig als **fairer Mediator** angelegt, nicht als Händler-Verhandler; sie liefert technisch nur **eine Zahl** statt **drei strategisch gestaffelter Linien**; und das Refinement arbeitet ohne **kumulative Verhandlungshistorie** und ohne **getrenntes Feld für die Kundenreaktion**, weshalb es im Kreis verhandelt und keinen kontrollierten "Schritt für Schritt mit Reziprozität"-Pfad fahren kann.

---

### Vorschlag für Auftrag 2 (zur Freigabe — wird erst nach deinem OK umgesetzt)

**Teil A — `retail-shield-pipeline/index.ts`**
1. System-Prompt komplett neu schreiben: Elite-Verhandler auf Diplomaten-Niveau, kompromisslos händlerseitig, tactical empathy + Anchoring + Reziprozität + Spieltheorie + "tatlı dil", konkrete BGB-Hebel (§§ 439, 323 V, 439 IV, 477, 438, 442, 440) explizit als Argumentationspunkte. Wörtlich verankerte rote Linie (keine Täuschung über Rechtslage, kein Verschweigen auf direkte Nachfrage).
2. Tool-Schema von **einer** Empfehlung auf **drei strategisch gestaffelte Optionen** umstellen: `optimal_for_merchant` / `balanced` / `relationship_protection`. Jede mit eigener `strategy_label`, `customer_wording`, `email_draft`, `estimated_merchant_cost_eur`, `goodwill_beyond_legal_eur` (Kennzeichnung "freiwillige Kulanz"), `required_role`, `legal_levers[]`, `confidence`. Default-Empfehlung = Option 1.
3. Rollen-Eskalation + RAG-Logik bleibt, wirkt jetzt auf die **empfohlene** Option.

**Teil B — `b2b-case-refine/index.ts` (Refinement)**
4. Kontextaufbau erweitern: **ALLE** `business_case_versions` für den Case in chronologischer Reihenfolge laden und als kompakte Verhandlungshistorie an die KI übergeben (Runde, Anweisung, gewählte Linie, customer_wording, geschätzte Kosten).
5. Aus `business_case_logs` zusätzlich Aktionen `customer_response` / `sent_to_customer` aufnehmen, falls vorhanden — sonst aus dem Freitext extrahieren.
6. Neuer System-Prompt: iterativer Elite-Verhandler, kleine kontrollierte Schritte mit Reziprozität, Deeskalation-vor-Inhalt, runden-bezogene Zusammenfassung ("Stand / abgelehnt / nächste kleinste Konzession / Kostenwirkung"). Rote Linie wörtlich wiederholt.
7. Tool-Schema erweitern um:
   - `round_summary` (Stand, was wurde abgelehnt, was war zuletzt angeboten)
   - `next_concession` (Beschreibung + EUR + Reziprozitäts-Gegenleistung)
   - `closure_recommendation` (optional, mit `trigger: "legal_required" | "economic_business_decision" | null`, `cost_comparison`, `requires_role_approval`)
   - `customer_message_draft`
   - `legal_levers_used[]`
8. Bei `trigger = "economic_business_decision"` UI-seitig klar als "Geschäftsentscheidung — Freigabe nötig" markieren, ggf. Rollen-Eskalation triggern (gleiche Logik wie heute).

**Teil C — `src/components/retail/case/RefinementChat.tsx`**
9. Zwei getrennte Eingabefelder: **"Kundenreaktion"** (was hat der Kunde geantwortet/wie reagiert) + **"Deine Anweisung"** (was die KI als Nächstes tun soll). Beide werden strukturiert an `b2b-case-refine` übergeben (`customer_response`, `instruction`).
10. Anzeige der drei Optionen + Markierung von Auslöser-A/B-Abschlussempfehlungen.

**Teil D — Testfälle**
11. Nach der Umsetzung die drei Testfälle (Stoffsofa-Naht / 300 €-Forderung mit Bewertungsdruck / Stur + Anwaltsdrohung) gegen die deployten Functions laufen lassen und Output zeigen.

**Außerhalb des Scopes:** B2C-Pallanx (`strategos-*`), neue Features, andere Funktionen, UI-Redesign.

---

Bitte das Analyse-Ergebnis bestätigen oder Korrekturen am Plan benennen — dann setze ich Teil A–D in dieser Reihenfolge um.