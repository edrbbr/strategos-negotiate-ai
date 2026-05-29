## Ausgangslage (aus GTM-Plan)

Die aktuelle Positionierung („Elite-Verhandlungs-Terminal für C-Level, 5-Mio-Deals, by invitation") trifft die falsche Zielgruppe. Laut Analyse:

- **Beachhead = deutschsprachige Solo-Selbständige, Freelancer, Berater/Coaches** (~1,8 Mio. DE) — nicht KMU-Geschäftsführer.
- **Marktlücke real**: kein direkter DE-Wettbewerber; Hauptkonkurrent sind generische LLMs + menschliche Coaches (€180–300/Std).
- **Preis €49/Pro = richtig**, aber Free zu knapp („3 lifetime") und Elite €199 für Beachhead irrelevant.
- **Hauptkanal**: LinkedIn „Building in Public" + PLG-Funnel.

## Entscheidungen (vom User bestätigt)

- **Elite**: bleibt sichtbar, aber dezent als „Auf Anfrage" (kein Self-Serve-Checkout).
- **Single-Case-Pass €29**: wird jetzt mit umgesetzt.
- **Ausführung**: alle drei Phasen direkt durchziehen, keine Zwischenabnahme.

## Phase 1 — Positionierung & Tarifstruktur

**Reframe**: „Dein KI-Verhandlungsstratege. Für Selbständige, Freelancer und Berater, die bessere Honorare, Preise und Verträge verhandeln."

**Tarif-Änderungen** (DB-Migration auf `plans`, `plan_prices`, `plan_features`):

| Tarif | Aktuell | Neu |
|---|---|---|
| Free | 3 Fälle lifetime | **1 voller Fall sofort + 1 Fall/Monat dauerhaft** (`case_limit_type='monthly'`, `case_limit=1`, plus Onboarding-Bonus) |
| Pro | €49/Mt · €468/Jahr · 15 Fälle/Monat | €49/Mt · **€490/Jahr** („2 Monate gratis") · **20 Fälle/Monat** |
| Elite | €199/Mt, by invitation, prominent | **Bleibt sichtbar, aber dezent als „Auf Anfrage"** — kein Self-Serve-Checkout, kleinerer visueller Footprint auf Pricing/Landing |
| **Single-Case-Pass** *(neu)* | — | **€29 Einmalkauf**, 1 vollständiger Fall, kein Abo |

**Feature-Texte** komplett neu in „Selbständigen-Sprache": Honorar- statt M&A-Beispiele, „dein Kunde sagt Nein" statt „Tier-1-Vendor", etc.

Stripe: Pro-Yearly-Preis-ID auf €490 aktualisieren (neue Price-ID via `payments--create_price`, alte deaktivieren); Single-Case-Pass als neues One-Time-Produkt `single_case_pass` / `single_case_one_time` €29 via `payments--create_product`.

## Phase 2 — Landingpage Rewrite (`src/pages/Landing.tsx`)

Komplette Neufassung in 6 Sektionen, Visual-Theme (Gold auf Weiß, Newsreader/Space Grotesk) bleibt:

1. **Hero**: „Du bist brillant in deinem Fach. Aber bei jeder Honorarverhandlung lässt du Geld liegen." → CTA „Kostenlos testen" (statt „Strategie-Briefing anfragen").
2. **Pain**: 3 Schmerzpunkte der Selbständigen (Kunde drückt Preis, Vertragsklausel übersehen, Honorarerhöhung wagen).
3. **Lösung/Demo**: gleiches Terminal-Mock, aber mit „Stundensatz +18 %", „Honorar verteidigt", „Mail-Entwurf in 5 Min".
4. **Vergleich**: PALLANX (€49/Mt, 5 Min, fertiger Draft) vs. Coach (€300/Std).
5. **Use Cases**: Honorarverhandlung · Projektpreis · Vertrag/Klausel · Kunde-will-Rabatt · Gehalts-/Konditionsgespräch.
6. **Final CTA**: „Starte deinen ersten Fall — kostenlos, ohne Kreditkarte." Invitation-/Quota-Sprache entfernen.

`PublicHeader`, Pricing-Seite (Texte + Single-Case-Pass-Tile + Elite dezent als „Auf Anfrage"-Card), `Register`-Page-Copy, SEO-Titel/-Description ebenfalls angleichen.

## Phase 3 — Sales-Pitch v3 neu (`pallanx-pro-pitch_v3.pptx`)

13–15 Slides, weißes Theme + eingebettete Fonts wie v2, aber inhaltlich auf GTM ausgerichtet:

1. Cover: „Du verlierst Honorar. In jedem Angebot."
2. Schmerz: 3 typische Verhandlungen pro Monat × €500 verloren = €18.000/Jahr
3. „Coach €300/Std vs. ChatGPT-Stundenlang" — Status quo
4. PALLANX-Doktrin: Spieltheorie + taktische Empathie, in 5 Minuten
5. Live-Demo-Mock (Honorarfall)
6. Output: Analyse + Strategie + fertiger Mail-Draft auf Deutsch
7. Use-Cases (5 typische Selbständigen-Situationen)
8. Free → Pro Funnel (Free testen, Pro €49 = 1 gewonnener Auftrag amortisiert ein Jahr)
9. Pricing (Free / Pro €49 mo / €490 Jahr / Single-Case €29 / Elite auf Anfrage)
10. Risk Reversal: ohne Kreditkarte testen
11. Einwände (Preis, „mache ich selbst mit ChatGPT", Datenschutz/DACH-Hosting)
12. Konkurrenz-Landschaft (Crystal, Pactum, Coaches) → Lücke
13. Roadmap: Solo → Sales-Teams → Procurement
14. CTA: „Erster Fall jetzt kostenlos"

## Technische Details

- **Migration**: `plans`-Update (Free auf `monthly`/1, Pro auf 20/Monat, Elite-Flag für „auf Anfrage"); neues Produkt-Modell für Single-Case-Pass — entweder eigener Plan-Eintrag `single_case` (`case_limit_type='lifetime'`, `case_limit=1`, `bookable_directly=true`) oder Wiederverwendung von `extra_credit_purchases`. Empfehlung: eigener Plan-Eintrag mit `tier_key='single_case'` + One-Time-Stripe-Produkt, da semantisch sauberer.
- **`sync_profile_from_subscription`**: aktualisierte Price-ID-Mappings (`pro_yearly` → €490 neue Stripe-ID), Single-Case läuft NICHT als Subscription, sondern via Webhook `checkout.session.completed` → Credit auf `extra_credits` (oder neue Spalte) gutschreiben.
- **`hooks/usePlans.ts`, `PlanCard.tsx`**: Single-Case-Pass als 4. Tile rendern; Elite-Card dezenter (kleinere Höhe, „Kontakt aufnehmen"-CTA statt Checkout).
- **Stripe-Webhook** (`payments-webhook`): One-Time-Checkout-Sessions für Single-Case erkennen und Credit gutschreiben.
- **SEO**: `Seo`-Tags auf neue Positionierung umstellen.
- **Auth/Edge-Funktionen**: keine Änderungen an `strategos-ai-router`, Refinement-Logik, Auth, RLS.

## Out of Scope

- Keine Änderungen an AI-Routing, Auth, E-Mail-Versand.
- Keine neuen Sprachen, kein neues Design-System — bestehendes Light-Theme bleibt.
- Bestehende Pro-Abonnenten behalten ihren aktuellen Preis (Stripe-Grandfathering); nur Neukunden bekommen €490/Jahr.
