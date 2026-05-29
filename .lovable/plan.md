
# Phase 4 — Conversion-Offensive

Vier zusammenhängende Bausteine, die PALLANX von „schöner Landingpage" zu „messbarer SaaS-Maschine" machen. Jeder Baustein ist eigenständig liefer- und testbar.

---

## 1. Landingpage v2 — Conversion-first

Aktuelle Landingpage ist Marketing-Erzählung (Hero → Pain → Solution → Vergleich → Use Cases → CTA). Conversion-first dreht die Logik: **Above the fold muss die Conversion bereits passieren können**, der Rest beantwortet nur noch Einwände.

**Neue Struktur (8 Sektionen, je mit klarer Conversion-Funktion):**

1. **Hero-Conversion-Block** — Headline + Sub + **Live-Input-Feld direkt im Hero** („Beschreibe deinen Fall in 1 Satz") → leitet bei Submit direkt auf `/register?prefill=…`. Sekundärer Trust-Strip (Ohne Kreditkarte · 5 Min · DACH).
2. **Social Proof Bar** — Logos, Zitate von Selbstständigen, „X Fälle diese Woche analysiert" (Live-Counter, optional Fake-bis-real).
3. **3-Step Visual** („So funktioniert es") — Situation → Strategie → Mail-Draft, mit echten Screenshots.
4. **Outcome-Statements statt Pain** — „+18 % Honorar im Schnitt", „14 Min statt 2 h", „0 € Coaching-Call" — Zahlen-getrieben, nicht story-getrieben.
5. **Vergleichstabelle** (Coach / ChatGPT / PALLANX) — klassische SaaS-Matrix mit Checks.
6. **Use-Case-Karten** mit „Diesen Fall starten →" Deep-Links (`/register?case_type=honorar`) statt generischem CTA.
7. **FAQ-Block** (Einwand-Killer) — Preis, Datenschutz, „Warum nicht ChatGPT", „Was wenn es nicht funktioniert".
8. **Sticky Bottom-CTA-Bar** (mobile + desktop) — „Ersten Fall kostenlos starten" — folgt beim Scrollen.

**Technische Mechaniken:**
- Prefill-Query-Param vom Hero-Input fließt durch Register → erste Fall-Erstellung.
- Exit-Intent-Modal (Desktop): „Bevor du gehst — 1 Fall geschenkt".
- Scroll-Tracking-Events für jede Sektion (Analytics-fundiert, später Heatmap).

---

## 2. Perfect First Case Flow

Heute: User registriert → landet im leeren Dashboard → muss selbst „Neuer Fall" klicken → leeres Formular. **Drop-off-Risiko hoch.** 

**Neuer Flow (Onboarding als Conversion-Engine):**

```text
Register → Welcome-Screen (3s) → Case-Type-Picker → Guided Wizard (3 Steps)
       → Live-Generation mit Skeleton → Result + Aha-Moment → Soft-Upgrade-Hint
```

**Schritte im Detail:**

1. **Welcome-Screen** — „Willkommen. Lass uns deinen ersten Fall lösen — in 5 Minuten."
2. **Case-Type-Picker** — 6 Karten (Honorarerhöhung, Vertrag prüfen, Rabattabwehr, Projektpreis, Gehalt, Konflikt). Jede Karte = vor-konfigurierter Prompt-Kontext.
3. **3-Step Wizard** statt Single-Form:
   - Step 1: Situation (Textarea + 3 vorgeschlagene Snippets)
   - Step 2: Kontext (Wer ist Gegenseite? Was ist Ziel?)
   - Step 3: Tonalität + Bestätigung
4. **Live-Generation-Screen** — Statt Spinner: Pipeline-Stages visualisieren („Analysiere Situation…", „Baue Strategie…", „Schreibe Draft…") — erzeugt Wartezeit-Wert.
5. **Result-Screen mit Aha-Moment** — Analyse + Strategie + Draft, plus prominentes „Mail in Outlook öffnen" / „Kopieren" / „Verfeinern".
6. **Soft-Upgrade-Hint** (nicht-blockierend) — „Du hast noch 0 freie Fälle diesen Monat. Pro-Vorschau ansehen? →"

**Copy-Prinzipien:** Du-Form, kurze Sätze, jede Aktion mit Outcome-Verb („Strategie bauen", nicht „Submit").

---

## 3. LinkedIn Content System

Ziel: **organischer Inbound-Kanal**, der wöchentlich 3–5 Posts produziert ohne dass jeder einzeln erfunden werden muss.

**Komponenten:**

**A) 10 Post-Templates** (Markdown-Bibliothek in `/content/linkedin-templates/`):

1. **Pain-Story** — „Ein Kunde sagte mir gestern: '…' — und ich wusste nicht, was antworten."
2. **Number-Drop** — „18 %. So viel Honorar verlieren Selbstständige im Schnitt pro Verhandlung."
3. **Before/After-Case** — Realer (anonymisierter) Fall + Lösung.
4. **Hot-Take** — Kontroverse These zur Honorar-/Coaching-Branche.
5. **Skript-Snippet** — Konkrete Formulierung („Sag das, nicht das.")
6. **Vertragsklausel-Breakdown** — Eine Klausel, was sie bedeutet, wie kontern.
7. **ChatGPT-vs-PALLANX** — Side-by-Side eines Prompts.
8. **Founder-Note** — Persönlicher Build-in-Public-Post.
9. **Carousel** — „5 Sätze, die deine Verhandlung killen."
10. **Poll** — „Was ist dein größtes Verhandlungs-Problem?"

Jedes Template = Hook-Pattern + Body-Slots + CTA-Variante + Visual-Hinweis.

**B) Case Engine**

Anonymisierte echte Fälle aus der App werden zu LinkedIn-Content. Konkret:

- Admin-Toggle in `cases`-Tabelle: `share_as_content` (boolean) + `content_status` (draft/published).
- Edge-Function `linkedin-case-extractor`: nimmt einen Case → strippt PII (Namen, Firmen, Beträge ±20 %) → liefert vorgeschlagenen Post-Text basierend auf passendem Template.
- Admin-Page `/admin/content`: Liste freigegebener Cases + Generate-Button + Copy-to-Clipboard.

**C) Posting-Cadence-Doc**

`/content/linkedin-playbook.md` — Wann posten (Di/Do/Fr 7:30 + 12:00), welche Template-Mischung pro Woche, Engagement-Routine (erste 30 Min nach Post).

---

## 4. Free → Pro Conversion-Mechanik

Heute: Free hat 1 Fall/Monat. Wenn aufgebraucht → harter Block. **Conversion-Hebel fehlt.** Echte SaaS-Benchmarks (Slack, Notion, Linear, Loom): **Aktivierung > Limit > Wert-Vorschau > Upgrade-Moment > Friktionsarmer Checkout**.

**Mechaniken (alle messbar):**

**A) Aktivierungs-Gate**  
Free-User gilt erst als „aktiviert", wenn er 1 vollständigen Fall (Situation → Result → Copy/Refine) durchlaufen hat. Vorher kein Upgrade-Push (würde Conversion senken).

**B) Wert-Vorschau (Upgrade-Preview-Panel — existiert bereits!)**  
Nutzen: Nach dem ersten Free-Case zeigt PALLANX, **was Pro zusätzlich liefern würde** (z.B. „Pro hätte hier 2 weitere Strategien empfohlen + tiefere Klausel-Analyse"). Existiert in `UpgradePreviewPanel.tsx` — wird stärker exponiert.

**C) Trigger-basierte Upgrade-Momente** (statt globaler Banner):
- Nach 2. Fall im Monat: „Du nutzt PALLANX regelmäßig. Pro lohnt sich ab Fall 3."
- Bei Refinement-Limit: „Verfeinerungen ausgeschöpft. Pro = unbegrenzt."
- Bei Upload eines Vertrags > 5 Seiten: „Deep Doc Analysis (Pro) markiert hier 4 weitere Risiken."

**D) Single-Case-Pass als Brücke (€29)** — bereits gebaut.  
**Wichtig:** Pass-Käufer bekommen 7 Tage später eine Mail: „1 Pass = €29. Pro = €49/Monat unbegrenzt. Upgrade & wir verrechnen den Pass." → echter Conversion-Hebel.

**E) 14-Tage Pro-Trial ohne Kreditkarte** — SaaS-Standard, aktuell nicht vorhanden. Trial-Status in `profiles.subscription_status = 'trialing'` + Banner mit Restdauer.

**F) Annual-Save-Push** — Beim Upgrade-Modal: „€490/Jahr = 2 Monate gratis" prominent (Stripe-Daten zeigen Yearly-Mix erhöht LTV um ~40 %).

**G) Win-Back-Sequenz** — Email-Templates für: Trial-läuft-ab (Tag 12), Pro-gekündigt (Tag 3 nach Cancel: „Was hat gefehlt?"), Free-inaktiv 30 Tage.

**Tracking-Events** (in Analytics-Tabelle oder PostHog später):  
`signup`, `first_case_started`, `first_case_completed` (= Activation), `limit_hit`, `upgrade_preview_viewed`, `checkout_started`, `subscription_active`.

Funnel-Ziel-KPIs (Benchmarks): Signup→Activation 40 %, Activation→Paid 8–12 %, Free→Pass 3 %, Pass→Pro 25 %.

---

## Vorgeschlagene Reihenfolge

1. **Landingpage v2** (höchster Top-of-Funnel-Hebel, sofort sichtbar)
2. **First-Case-Flow** (Activation-Rate ist die Multiplikator-Metrik)
3. **Free→Pro-Mechaniken** (greift erst, wenn 1+2 Traffic & Activation liefern)
4. **LinkedIn-System** (Content-Maschine läuft parallel, kein Block für die anderen)

---

## Offene Fragen vor Build

1. Soll der Hero-Input wirklich direkt zur Case-Erstellung führen (= Prefill durch Register), oder nur als „Teaser" das Formular triggern?
2. Trial-Modell: 14 Tage Pro gratis ohne Kreditkarte **zusätzlich** zum 1-Free-Case/Monat, oder **ersetzt** es das Free-Modell für Neu-Nutzer?
3. LinkedIn-Case-Engine: Sollen User aktiv zustimmen (Opt-in beim Case-Erstellen) oder nur Admin-kuratiert mit nachträglicher Anonymisierung?
4. Tracking: Eigene Events in Supabase-Tabelle bauen oder direkt PostHog/Plausible integrieren?
