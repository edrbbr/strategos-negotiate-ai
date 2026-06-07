# Block 2a — Landingpage /retail/moebelhandel (DE)

Nur diese eine Seite als Vorlage. Kfz und Elektronik erst nach Freigabe. Keine AT/CH-Routen.

## Route & Datei
- Neue Datei: `src/pages/retail/branchen/Moebelhandel.tsx`
- Neue Route in `src/App.tsx`: `/retail/moebelhandel` (öffentlich, ohne RetailLayout-Login-Chrome — nutzt eigenes Marketing-Layout analog `RetailLanding`)
- Aufnahme in `scripts/generate-sitemap.ts` (Priority 0.8, changefreq monthly)

## SEO-Kopf (react-helmet-async)
- `<title>`: "Reklamationen im Möbelhandel rechtssicher & fair bearbeiten | Pallanx"
- `<meta description>`: ~155 Zeichen, Möbelhandel + BGB §§ 437/439 + faire Abwicklung
- `<link rel="canonical">` auf `https://pallanx.com/retail/moebelhandel`
- OpenGraph (title, description, url, type=website)
- `<html lang="de">` via `useHtmlLang('de')`
- JSON-LD: **FAQPage** (6 Fragen) + **BreadcrumbList** (Home › Branchen › Möbelhandel)

## Inhalt (~1.500 Wörter, Tonalität "rechtskonform & fair")

Durchgehende Linie: Nicht "wie wehre ich Kunden ab", sondern "wie reagiere ich rechtssicher UND fair, so dass Kunde und Händler beide profitieren". Sprache: "so bearbeiten Sie das korrekt", "so dokumentieren Sie sauber", "fair und gesetzeskonform".

1. **Hero**
   - H1: "Reklamationen im Möbelhandel — rechtssicher und fair in Minuten bearbeitet"
   - Subline (2–3 Sätze): Problemraum + Pallanx als strukturierte Hilfe
   - Primär-CTA "Kostenlose Demo anfragen" → `/retail/register?utm_source=lp&utm_medium=organic&utm_campaign=moebelhandel`
   - Sekundär "Wie es funktioniert" (Anchor)

2. **Problemkontext (~200 Wörter)**
   - EHI-Retourenkostenrahmen (10–20 €/Retoure), Möbel-Spezifika: Speditionsversand, Sperrgut, Aufbau, Kratzer/Transportschäden
   - Wer haftet wann (Spedition vs. Händler vs. Hersteller) — sachlich

3. **Rechtsrahmen kompakt (~250 Wörter)**
   - BGB § 434 Sachmangel, § 437 Rechte des Käufers, § 439 Nacherfüllung (Wahlrecht des Käufers), § 441 Minderung, § 323 Rücktritt
   - § 477 BGB Beweislastumkehr 12 Monate (B2C)
   - Aufbau-/Montageleistung als Werkvertrag §§ 633 ff.
   - Hinweis: Information, kein Rechtsrat

4. **5 konkrete Reklamationsbeispiele Möbel (~500 Wörter, je ~100)**
   Jeweils Struktur: *Sachverhalt → Rechtliche Einordnung → Faire & korrekte Bearbeitung → Pallanx-Workflow*
   - **Transportschaden Sofa (Kratzer am Bezug)**: Nacherfüllung anbieten (Reparatur durch Polsterer ODER Austausch des Bezugs; Käufer wählt)
   - **Quietschende Federung Boxspringbett nach 8 Monaten**: Beweislastumkehr greift; großzügige Prüfung vor Ort, dokumentierte Nacherfüllung
   - **Schubladenfront eines Kleiderschranks gelöst (4 Wochen)**: Mangel offensichtlich, schnelle Ersatzteillieferung statt Diskussion
   - **Farbabweichung Massivholz-Tisch (natürliche Maserung)**: Aufklärung mit Belegfotos aus Produktbeschreibung; bei Unzumutbarkeit kulant Rücknahme anbieten
   - **Aufbaufehler durch beauftragten Monteur (Werkvertrag)**: §§ 634/635 BGB, kostenfreie Nachbesserung, Verantwortung übernehmen
   Jeweils geschlossen mit: "Pallanx legt dafür automatisch Vorgang, Frist, Doku und Kundenkommunikation an."

5. **Value Proposition / Features (~200 Wörter)**
   - 3-Spalten-Block: Rechtssichere Vorlagen · Fristen-Tracker (14/30 Tage Nacherfüllung) · Kunden-Portal mit fairen Lösungen
   - Statistik-Zeile aus GTM (EHI-Zahlen, Sparpotenzial)

6. **Interne Verlinkung (~80 Wörter)**
   - Verweise (Text & Links) auf kommende Branchen: "Auch relevant: Kfz-Werkstatt (in Kürze), Elektronikhandel (in Kürze)" — als reiner Text, **keine Dead-Links**, keine Route. Wenn Routen vorhanden sind, werden sie hier später ergänzt.
   - Link zu `/retail` (Übersicht) und `/preise`

7. **FAQ (6 Fragen, ~250 Wörter)** — gerendert + identisch im FAQPage JSON-LD
   - Was muss ich bei einem Transportschaden tun?
   - Wer hat das Wahlrecht bei der Nacherfüllung — Kunde oder Händler?
   - Welche Fristen gelten für die Nacherfüllung?
   - Wann greift die Beweislastumkehr bei Möbeln?
   - Wie gehe ich mit Reklamationen am Aufbauservice um?
   - Wann ist eine Rücknahme statt Reparatur fair?

8. **CTA-Footer**
   - "Demo anfragen" → `/retail/register?utm_source=lp&utm_medium=organic&utm_campaign=moebelhandel`

## Komponenten / technisch
- Eigenständige Datei, kein neues Design-System. Nutzt vorhandene shadcn-Components (`Button`, `Card`, `Accordion` für FAQ), Tailwind-Tokens.
- Tonalitätsreview: Lektorat-Pass über alle Beispiele auf "fair statt abwehrend"; keine Formulierungen wie "abwimmeln", "Kunden zurückweisen", "Reklamation ablehnen" außer wenn explizit rechtlich unzulässig.
- UTM-Capture-Hook ist bereits aktiv; CTA-Links tragen Default-UTM als Fallback.

## Nicht enthalten
- Kfz-Werkstatt, Elektronikhandel (warten auf Freigabe)
- AT/CH-Routen, keine "Coming soon"-Stubs
- Magazin, Plausible, aktives gtag, SEA-Kampagnen
- Schema.org Organization/Product (separat)

## Nach Build: Test-Checkliste
- Route `/retail/moebelhandel` lädt, `<title>` und Canonical korrekt im DOM
- FAQPage + BreadcrumbList JSON-LD valide (Rich-Results-Test)
- Sitemap enthält neue URL
- CTA setzt UTM in localStorage und übermittelt sie an `b2b-lead-submit` / Register
- Mobile-Layout (393px) sauber
- Wortzahl ≥ 1.400 (Ziel ~1.500)
