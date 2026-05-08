# PALLANX Landing Page — Elite B2B Conversion Redesign

## Ziel
`src/pages/Landing.tsx` komplett neu aufbauen: Weg von der Educational-Brochure hin zu einer scharfkantigen High-Ticket-Conversion-Seite, die ausschließlich das **Strategie-Briefing** verkauft.

## Theme-Verhalten (wichtig)
- Seite respektiert weiterhin den globalen Theme-Toggle. **Standard = Light (weiß).**
- Es wird **kein** Dark-Mode erzwungen.
- Statt fixer Hex-Farben (`#080909`, `#C9A84C`) wird die Seite vollständig über die bestehenden semantischen Tokens (`bg-background`, `text-foreground`, `text-primary`, `border-border`) gestylt — diese sind im Light-Mode bereits weiß/Gold (`#a4863e`) und im Dark-Mode tief-schwarz/Gold. Die elitäre Optik (scharfe Kanten, Hairlines, Newsreader-Typo, viel Weißraum) funktioniert in beiden Modi.
- ThemeToggle bleibt im Header sichtbar.

## Design-Prinzipien
- **Geometrie:** scharfe Kanten — `rounded-none` durchgängig, dünne Gold-Hairlines (1px `border-primary/40` bzw. `bg-primary`), keine Schatten/Glows.
- **Typografie:** Headings `Newsreader` (Serif, teils Italic auf Schlüsselwort), UI/Labels `Space Grotesk` uppercase tracking-[0.2em].
- **Rhythmus:** großzügiges vertikales Padding (`py-32`+), Section-Labels mit ◆-Glyphe + Nummer.

## Seitenstruktur (5 Sektionen)

### 1. THE GATE (Hero)
[Layout: nahezu Vollhöhe (min-h-[85vh]). Zentrierter Inhalt, max 900px. Über der Headline: Gold-Hairline (40px) + Label "◆ PALLANX INTELLIGENCE TERMINAL". Rechts oben am Viewport-Rand klein: "TERMINAL // SESSION 04.26 // CLEARANCE REQUIRED" in Space Grotesk uppercase.]

**Headline (Newsreader, ~80px, Italic auf Schlüsselwort):**
> Sie verlieren Marge.
> In jedem Meeting. *Lautlos.*

**Subheadline:**
> Während Sie verhandeln, kalkuliert Ihr Gegenüber. Jeder nachgegebene Prozentpunkt auf einem 5-Millionen-Deal kostet Sie 50.000 €. PALLANX beendet die Asymmetrie.

**CTA Primary:** `Strategie-Briefing buchen →` (gold-fill)
**CTA Secondary:** `Terminal-Zugang anfragen` (text-link gold)

**Trust-Bar (klein, uppercase, Hairline-Separatoren):**
`SOUVERÄN · DISKRET · BY INVITATION`

---

### 2. THE PAIN (Diagnose)
[Section-Label "◆ 01 / DIE DIAGNOSE". Großes H2, dann 3-Spalten-Grid mit Hairline-Separatoren — keine Cards, nur Linien.]

**H2:** *Drei stille Killer Ihres EBITDA.*

- **ASYMMETRIE** — Ihr Tier-1-Lieferant kennt Ihre Wechselkosten besser als Sie selbst. Er weiß, dass Sie nicht gehen werden. Also bezahlen Sie jedes Jahr 12 % mehr — und nennen es „Inflation".
- **EMOTION** — Im entscheidenden Moment greift Ihr limbisches System ein. Sie reden, um die Stille zu füllen. Sie geben nach, um die Beziehung zu retten. Sie verlieren — höflich.
- **IMPROVISATION** — Ihre Gegenseite hat ein Playbook, ein Legal-Team und drei Wochen Vorbereitung. Sie haben ein Bauchgefühl und einen vollen Kalender. Der Ausgang ist mathematisch determiniert.

[Closing-Zeile, Newsreader Italic Gold, zentriert:]
> *Verhandeln ohne System ist die teuerste Form von Optimismus.*

---

### 3. THE PARADIGM SHIFT (Lösung)
[Layout: 60/40-Split. Links Copy, rechts minimalistische „Terminal-Karte" — Block mit 1px-Gold-Border, innen Status-Lines in Space Grotesk: `LEVERAGE INDEX: 0.84 | BATNA: SECURED | CONCESSION CEILING: 3.2% | RECOMMENDED MOVE: ANCHOR HIGH`. Rein typografisch, kein Screenshot.]

**Section-Label:** `◆ 02 / DER UNFAIRE VORTEIL`

**H2:** PALLANX ist keine Software. Es ist eine *Doktrin*.

**Body:**
> Wir kombinieren die Verhörtaktik des FBI mit den spieltheoretischen Modellen, die Hedgefonds für M&A-Mandate einsetzen — und destillieren beides in ein Terminal, das jede Ihrer Verhandlungen in Echtzeit kalibriert.
>
> Das Ergebnis ist nicht „bessere Kommunikation". Das Ergebnis ist Souveränität.

**Drei Outcomes (Hairline-getrennt, Gold-Ziffer 01/02/03):**
- **Wasserdichte Verträge.** Klauseln, die Ihre Gegenseite unterschreibt, weil sie keine andere Wahl sieht.
- **Verteidigte Marge.** Die Konzessionen finden auf der anderen Seite des Tisches statt.
- **Totale Kontrolle.** Sie diktieren das Tempo, das Framing und den Ausgang.

---

### 4. THE ARENAS (Use Cases)
[4-Spalten-Grid (mobile 1-spaltig) mit Hairline-Borders. Pro Zelle: römische Ziffer in Gold, Titel Newsreader, ein scharfer Satz.]

**Section-Label:** `◆ 03 / EINSATZGEBIETE`
**H2:** Wo PALLANX operiert.

- **I. M&A Earn-Outs** — Wenn 18 Monate nach Closing entschieden wird, ob Ihr Exit ein Triumph oder eine Fußnote war.
- **II. Tier-1 Vendor Renewals** — Wenn SAP, Salesforce oder AWS das Gespräch mit „geringfügigen Anpassungen" eröffnen.
- **III. Hostile B2B Disputes** — Wenn die Anwaltskanzlei der Gegenseite teurer ist als Ihre Forderung.
- **IV. Board & Investor Negotiations** — Wenn Term Sheets über Kontrollmehrheiten entscheiden und jedes Komma zählt.

---

### 5. THE FINAL GATE (Sell the Meeting)
[Vollbreiter Block, oben und unten 1px-Gold-Hairline, sehr viel vertikales Padding (160px+), zentriert max 760px. Label „◆ EVALUATION".]

**H2 (Italic auf Schlüsselwort):**
> 30 Minuten. Oder die nächsten *€500.000*.

**Body:**
> Der nächste 5-Millionen-Deal verliert 10 %, wenn Sie unvorbereitet hineingehen. Das sind 500.000 €, die Sie nie sehen werden — und nie vermissen, weil sie nie auf Ihrem Konto waren.
>
> Das Strategie-Briefing dauert 30 Minuten. Wir prüfen, ob Ihre Mandatslage PALLANX rechtfertigt. Wenn nicht, sagen wir es Ihnen.

**CTA Primary (groß):** `Strategie-Briefing anfragen →`
**Sub-CTA:** `Eligibility prüfen lassen`

**Microcopy:** *By invitation. Limitiertes Mandatskontingent pro Quartal.*

---

## Header & Footer
- **Header:** bestehender `PublicHeader` bleibt (mit ThemeToggle, Login, Preise-Link). Kein eigener Terminal-Header.
- **Footer:** schmal, einzeilig, Hairline oben — `PALLANX // ELITE NEGOTIATION TERMINAL · IMPRESSUM · DATENSCHUTZ · © 2026`.

## Entfernt aus der bisherigen Landing
- Process-Sektion (Situation/Strategie/Text)
- Konsumenten-Use-Cases (Auto, Reklamation, Gehalt, Miete, Kleinanzeigen)
- PricingSection inkl. `usePlans`/`PlansGrid` (Pricing nur noch unter `/preise`)
- FAQ-Sektion
- „Demo Ansehen"-Button

## Technische Umsetzung
- **Datei:** `src/pages/Landing.tsx` neu schreiben.
- **Tokens only:** ausschließlich semantische Tailwind-Tokens (`bg-background`, `text-foreground`, `text-primary`, `border-primary/40`, `bg-card`). Keine Hex-Werte im JSX.
- **CTA-Routing:** beide Briefing-CTAs → `/register` (bestehender Flow). Falls später Cal.com gewünscht, einfach austauschbar.
- **Keine Animationen** außer optionalem 300ms Fade-In auf Hero.
- **Responsive:** Mobile-first, alle Grids kollabieren auf 1 Spalte; Headlines skalieren `text-5xl md:text-7xl lg:text-8xl`.

## Offen
- CTA-Ziel: `/register` ok, oder externer Booking-Link (Cal.com/Calendly/`mailto:`)? Falls unklar, default `/register`.
