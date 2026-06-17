## Ziel

Zwei Korrekturen vor Teil B:

1. **Cold-Start-Fehler bei "Fall analysieren"** abfangen, damit der erste Klick nicht ins Leere läuft.
2. **Tool-Schema beider KI-Funktionen** so umbauen, dass strikt zwischen Kunden-Zugeständnis und händler-internen Kosten getrennt wird.

---

## 1. Cold-Start-Fix für `retail-shield-pipeline`

Die Edge-Function bootet beim ersten Aufruf neu (Logs zeigen "booted" direkt vor jedem Shutdown). Wenn die Anthropic-Antwort lange dauert, schlägt der erste Request fehl. Lösung **nur clientseitig** (kein Backend-Eingriff):

- In `useBusinessCases.ts` → `useRunPipeline` einen kontrollierten Retry mit Backoff (1× nach 1.5 s) einbauen, der nur bei Netzwerk-/`FunctionsFetchError`/`504`/`502` greift, NICHT bei fachlichen 400/403/422-Fehlern.
- Toast erst nach finalem Fehlschlag anzeigen; im Erfolgsfall des Retrys still durchlaufen.
- Button-Label während Pending bleibt "Analysiere…".

Keine Architekturänderung Richtung Job-Queue — nur Resilienz für den Boot-Kaltstart.

---

## 2. Schema-Trennung: Kundenzugeständnis vs. interne Kosten

### 2a. `retail-shield-pipeline/index.ts` — Tool-Schema

Pro Option im Tool-Schema `amount_eur` ersetzen durch:

```
customer_concession_eur:  number  // tatsächlich an Kunde (Geld/Gutschein/Wertausgleich). Reparatur/Nacherfüllung => 0.
merchant_internal_cost_eur: number // interne Umsetzungskosten (Reparatur, Anfahrt, Ersatzteil). NIE an Kunde.
goodwill_beyond_legal_eur: number  // bleibt, bezieht sich auf customer_concession über gesetzliche Pflicht hinaus.
percent_of_purchase: number        // basiert auf customer_concession_eur / purchase_price_total.
```

System-Prompt ergänzen:
- "Bei reiner Nacherfüllung/Reparatur ist `customer_concession_eur` immer 0."
- "`merchant_internal_cost_eur` ist eine interne Entscheidungsgröße — darf NICHT in `customer_wording` oder `email_draft` erscheinen."
- "`percent_of_purchase` und Approval-Limits beziehen sich ausschließlich auf `customer_concession_eur`."

Approval-Routing (`requiredRole`) auf `customer_concession_eur` umstellen (interne Kosten lösen keine Eskalation aus).

`suggested_offer` / `suggested_offer_percent` auf der `business_cases`-Zeile = `customer_concession_eur` der gewählten Option.

### 2b. `b2b-case-refine/index.ts` — selbe Schema-Trennung

- Selbe Felder im `recommendation`-Objekt.
- `closure_recommendation.proposed_amount_eur` → bleibt, ist Kundenzugeständnis (klarstellender Kommentar).
- Transcript-Renderer anpassen: zeigt "Zugeständnis Kunde: X € · interne Kosten: Y €" statt nur `amount_eur`.

### 2c. Frontend — `RefinementChat.tsx` & `RetailCaseDetail`

- Strategy-Cards zeigen zwei klar getrennte Zeilen:
  - **Zugeständnis an Kunde:** `customer_concession_eur` (groß, primär)
  - **Interne Umsetzungskosten:** `merchant_internal_cost_eur` (kleiner, mit Tooltip "Nur intern, wird dem Kunden nicht kommuniziert")
- Approval-Badges nutzen nur `customer_concession_eur`.
- `customer_wording` / `email_draft` unverändert anzeigen — Prompt sorgt dafür, dass interne Kosten dort nicht auftauchen.

### 2d. Hook `useBusinessCases.ts` (Typen)

- TypeScript-Typ für eine Option erweitern: `customer_concession_eur`, `merchant_internal_cost_eur` ergänzen; `amount_eur` als optional/legacy belassen (Fallback `amount_eur ?? customer_concession_eur` für Altfälle).

### 2e. Abwärtskompatibilität

Bestehende Fälle in der DB haben `amount_eur`. UI/Pipeline lesen mit Fallback:
```
const concession = opt.customer_concession_eur ?? opt.amount_eur ?? 0;
const internal   = opt.merchant_internal_cost_eur ?? 0;
```
Keine Migration nötig — Felder leben in `ai_options` (jsonb).

---

## Validierung (nach Build)

Sofa-Fall (Riss, Reparatur möglich) erneut analysieren und prüfen:
- Option 1 "optimal_for_merchant": `customer_concession_eur = 0`, `merchant_internal_cost_eur ≈ 80`, `customer_wording` spricht nur von Reparatur, nennt KEINE 80 €.
- 300-€-Fall: Option 1 Zugeständnis 0 €, interne Kosten der Reparatur ausgewiesen.
- Eskalations-Fall: Approval-Stufe basiert auf Zugeständnis, nicht auf interner Kosten.

Erst nach grüner Validierung an Teil B (weitere Verhandlungslogik).
