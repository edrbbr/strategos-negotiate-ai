## Korrekturen an `pallanx-pro-pitch.pptx`

Zwei gezielte Fixes am Generator-Skript, damit die PPTX exakt dem Light-Theme der Webseite (Gold auf Weiß, Newsreader + Space Grotesk) entspricht.

### 1. Farbpalette: Light Theme (Gold auf Weiß)

Aus `src/index.css` (`:root`, Light Mode) übernommen — nicht mehr Dark Mode:

| Token | Alt (Dark) | Neu (Light, Hex) | HSL-Quelle |
|---|---|---|---|
| Background | `#0B0B0C` | `#FFFFFF` | `0 0% 100%` |
| Surface / Card | — | `#FAFAFA` | `0 0% 98%` |
| Foreground | `#F0EADD` | `#1A1A1A` | `0 0% 10%` |
| Muted Foreground | `#8A8478` | `#666666` | `0 0% 40%` |
| Primary / Gold | `#D4B158` | `#A4863E` | `41 45% 44%` |
| Gold Dim / Border | `#2A2825` | `#E6E6E6` | `0 0% 90%` |

Anpassungen pro Slide-Typ:
- Cover/CTA/Pull-Quote: weißer Hintergrund, schwarze Headline, Gold-Akzente (Diamant „◆", Trennlinien, Mandate-Code)
- Stat-Slides: große Zahl in Gold `#A4863E`, Labels in `#1A1A1A`, Captions in `#666666`
- Terminal-Demo-Slide: hellgraues Surface `#FAFAFA` mit Gold-Border `#A4863E` statt schwarzem Panel; Key/Value-Rows in Schwarz, Werte in Gold
- 2×2 / 3-Spalten-Grids: weißer Karten-Hintergrund, dünne `#E6E6E6` Borders, Gold-Diamant als Marker
- Footer/Page-Number: `#666666` auf Weiß

### 2. Schriftarten: Newsreader + Space Grotesk einbetten

Auf der Webseite (aus `src/index.css` Google-Fonts-Import + `tailwind.config.ts`):
- **Serif (Headlines, Body-Default)**: `Newsreader`
- **Sans (Labels, Kicker, Mono-artiges)**: `Space Grotesk`

Aktuell nutzt das Skript Platzhalter wie „Playfair / Cormorant / Inter", die auf dem Gerät des Betrachters nicht garantiert vorhanden sind → PowerPoint fällt auf Calibri/Arial zurück.

Lösung — echtes Font-Embedding im PPTX:
1. Im Build-Schritt die TTF-Dateien für `Newsreader` und `Space Grotesk` von Google Fonts herunterladen (Regular, Italic, 500, 600, 700) und nach `/tmp/fonts/` legen
2. `pptxgenjs` selbst kann keine Fonts in die PPTX einbetten — daher Post-Processing: PPTX entpacken, Fonts unter `ppt/fonts/` als `.fntdata` ablegen, Einträge in `ppt/presentation.xml` (`<p:embeddedFontLst>`) und `ppt/_rels/presentation.xml.rels` ergänzen, Content-Types erweitern, neu zippen
3. In allen `slide.addText(...)`-Aufrufen `fontFace: "Newsreader"` bzw. `"Space Grotesk"` explizit setzen (statt der bisherigen Platzhalter-Namen), damit die eingebetteten Fonts beim Öffnen gezogen werden
4. Validierung: PPTX entpacken und prüfen, dass `ppt/fonts/` die TTFs enthält und `presentation.xml` die `embeddedFont`-Einträge listet

### 3. QA

- LibreOffice → PDF → `pdftoppm` JPGs für alle 13 Slides
- Visuell prüfen: weißer Hintergrund überall, ausreichender Kontrast (Gold `#A4863E` auf Weiß ist WCAG-AA-grenzwertig → für reine Text-Labels Schwarz statt Gold verwenden, Gold nur für Akzente/Zahlen/Linien)
- Terminal-Slide besonders prüfen (war zuvor dominant dunkel)
- Output: `pallanx-pro-pitch_v2.pptx` (neue Datei, Original bleibt zum Vergleich)

### Was nicht passiert

- Keine Änderungen am App-Code, Routen, Stripe oder Pricing
- Keine inhaltlichen Slide-Änderungen — nur Farben + Fonts
- Kein neues Design — exakte Übernahme des bestehenden Light-Themes der Webseite

### Hinweis zu Credits

Eine Rückerstattung von Credits kann ich technisch nicht selbst auslösen — das läuft über das Lovable-Support-Team. Du kannst die Anfrage über das Hilfe-Menü (Support) im Lovable-Dashboard stellen; ich erstelle die korrigierte Version v2 ohne weitere Rückfragen.
