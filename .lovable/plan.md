## Ziel

Eine deutschsprachige **Verkaufspräsentation als `.pptx`-Download** (12–14 Slides), die das Pro-Paket pitcht und Free als sofortigen Einstieg positioniert. Stil und Tonalität folgen 1:1 der Landing Page (`src/pages/Landing.tsx`): Serif-Headlines, Gold-Akzent, Terminal-Ästhetik, Pain → Doktrin → Beweis → CTA.

Datei wird unter `/mnt/documents/pallanx-pro-pitch.pptx` abgelegt und als `<presentation-artifact>` ausgeliefert.

## Verkaufspsychologische Dramaturgie

Die Reihenfolge folgt bewährten Sales-Mustern (Cialdini, Challenger Sale, Sandler, Straight Line):

1. **Pattern Interrupt** – Headline, die provoziert
2. **Pain Agitation** – konkrete Verlustzahl (€500.000 / Deal)
3. **Cost of Inaction** – stille Killer benennen
4. **Solution Reveal** – PALLANX als Doktrin, nicht Tool
5. **Mechanismus** – wie es funktioniert (Leverage, BATNA, Framing)
6. **Use Cases** – Einsatzgebiete = Identifikation
7. **Produkt-Demo-Visual** – Terminal-Karte (Glaubwürdigkeit)
8. **Pro-Paket im Detail** – Features, Preis-Anker
9. **Risk Reversal** – Free zum sofort Testen
10. **Urgency & Scarcity** – limitiertes Kontingent
11. **Einwand-Behandlung** – „Zu teuer / brauche ich nicht"
12. **CTA** – klare nächste Schritte

## Slide-Aufbau (13 Slides)

1. **Cover** – „Sie verlieren Marge. In jedem Meeting. Lautlos." + Pallanx-Logo + Subline
2. **Der versteckte Verlust** – Stat-Slide: 1 % auf 5 Mio. = 50.000 €, 10 % = 500.000 €
3. **Die drei stillen Killer** – Asymmetrie / Emotion / Improvisation (3-Spalten-Grid)
4. **Die teuerste Form von Optimismus** – Pull-Quote-Slide, voll Gold-Akzent
5. **Paradigmenwechsel** – „PALLANX ist keine Software. Es ist eine Doktrin." (FBI + Spieltheorie)
6. **Was Sie gewinnen** – 3-Punkte: Wasserdichte Verträge / Verteidigte Marge / Totale Kontrolle
7. **Live-Terminal Demo** – Mock-Karte: Leverage Index 0.84, BATNA Secured, Recommended Move „Anchor High. Hold Silence."
8. **Einsatzgebiete** – M&A Earn-Outs / Vendor Renewals / B2B Disputes / Board Negotiations (2x2-Grid)
9. **Das Pro-Arsenal** – alle 8 Pro-Features aus der Datenbank, Highlights gold
10. **Preis-Anchoring** – Pro €49/Monat oder €468/Jahr (effektiv €39 / Monat → 20 % gespart), gerahmt durch „ein einziger gewonnener Verhandlungspunkt amortisiert 10 Jahre Pro"
11. **Risk-Reversal: Free** – „Sofort testen. Ohne Karte. Ohne Risiko." → 1 Pilot-Fall mit Free, Upgrade wenn überzeugt
12. **Einwand-Behandlung** – 3 typische Einwände + Konter („Zu teuer", „Mein Bauchgefühl reicht", „Keine Zeit")
13. **Call to Action** – Free starten / Pro aktivieren, URL pallanx.com, „By invitation. Limitiertes Mandatskontingent."

## Visuelles Design

- **Format**: 16:9, 13.333 × 7.5 in
- **Farben** (aus `src/index.css` Brand-Tokens, dunkles Terminal-Theme):
  - Hintergrund: `#0B0B0C` (near-black)
  - Foreground: `#EDE9DF` (warm off-white)
  - Primary/Gold: `#C9A24B`
  - Muted: `#7A766C`
  - Border: `#2A2825`
- **Typografie**: Headlines Serif (Playfair / Cormorant); Body & Labels Sans (Inter); Kicker uppercase, letter-spacing 0.25em, gold
- **Motiv-Wiederholung**: Goldenes Diamant-Glyph „◆" + Section-Counter („◆ 03 / Einsatzgebiete") auf jeder Content-Slide; dünne goldene Trennlinie statt „AI-Headline-Underline"
- **Slide-Chrome**: oben links Kicker, oben rechts Mandate-Code (z. B. „Terminal // 04.26"), unten links Logo, unten rechts Seitenzahl
- Live-Terminal-Slide nutzt monospaced Look mit Key/Value-Rows wie auf Landing Page

## Technische Umsetzung

- Skript `scripts/build-pitch.cjs` mit `pptxgenjs` (lokal via `npm i -D pptxgenjs`, nicht in Hauptbundle)
- Ausgabe: `/mnt/documents/pallanx-pro-pitch.pptx`
- QA-Pflicht: PPTX → PDF via LibreOffice → `pdftoppm` → jede Slide als JPG visuell prüfen auf Overflow, Kontrast, Alignment; bei Defekten Skript fixen und neu rendern
- Lieferung im Chat via `<presentation-artifact path="pallanx-pro-pitch.pptx" mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"></presentation-artifact>`

## Was nicht passiert

- Keine Änderungen am App-Code, an Routen oder am Stripe-Setup
- Kein neuer Pitch-Bereich in der Web-App
- Keine Inhalte über das hinaus, was Landing Page + Pro-Plan-Daten bereits aussagen
