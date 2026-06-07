# SEA — Google-Ads-Kontostruktur (Doku, kein Setup)

**Status:** Reine Dokumentation. Kein Google-Ads-Konto verbunden. Kein Conversion-Tag aktiv (nur Frontend-Stub `track-conversion` existiert).

## 1. Konto-Logik

- **1 Konto** Pallanx GmbH (später, wenn Firma existiert)
- **2 Top-Kampagnen-Cluster** — strikt getrennt, weil unterschiedliche Zielseiten, CPA-Ziele und Match-Verhalten:
  - **B2C-Search** → Landingpages `/magazin/*`, `/` (für Single-Case-Pass)
  - **B2B-Search** → Landingpages `/retail`, `/retail/moebelhandel`, `/retail/kfz-werkstatt`, `/retail/elektronikhandel`
- **Kein Display, kein Performance Max im ersten Halbjahr.** Reine Search-Disziplin, bis Conversion-Volumen ≥ 30/Monat pro Kampagne.

---

## 2. Kampagnen-Layout

### Kampagne 1: `B2C — Reklamation DE Search`

- **Ziel:** Erst-Sichtbarkeit + Magazin-Klicks (Top-of-Funnel)
- **Tagesbudget:** 8 € (240 €/Monat) — bewusst klein, Lerndaten
- **Gebotsstrategie:** Manual CPC mit max. 0,80 €
- **Standort:** Deutschland
- **Sprache:** Deutsch
- **Geräte:** alle, mobile bid −10 %
- **Conversion:** Magazin-Scroll 75 % + Klick auf `/preise`

Anzeigengruppen:
- AG 1.1 `Reklamation BGB Verbraucher`
- AG 1.2 `Sachmangel Nacherfüllung`
- AG 1.3 `Beweislastumkehr 477 BGB`

### Kampagne 2: `B2B — Retail Shield DE Search`

- **Ziel:** Demo-Anfragen über `/retail#kontakt`
- **Tagesbudget:** 15 € (450 €/Monat) — größerer Hebel, höherer CLV
- **Gebotsstrategie:** Manual CPC mit max. 2,50 €, später Target-CPA wenn ≥ 15 Conversions/Monat
- **Standort:** Deutschland (Österreich/Schweiz später)
- **Geräte:** alle, mobile bid −20 % (B2B-Demo selten mobil)
- **Tagesplan:** Mo–Fr 08–18 Uhr +25 %, sonst −50 %
- **Conversion:** Lead-Submit auf `b2b-lead-submit` Edge Function

Anzeigengruppen:
- AG 2.1 `Reklamationsmanagement Möbelhandel` → `/retail/moebelhandel`
- AG 2.2 `Reklamationsmanagement Kfz-Werkstatt` → `/retail/kfz-werkstatt`
- AG 2.3 `Reklamationsmanagement Elektronikhandel` → `/retail/elektronikhandel`
- AG 2.4 `Reklamation Software Einzelhandel` (generisch) → `/retail`
- AG 2.5 `Retouren Kosten reduzieren` → `/retail` mit `utm_campaign=retouren-kosten`

---

## 3. Budget-Caps & Lern-Regeln

- **Initialphase (Wochen 1–4):** Kampagnen-Budget fix, Gebote manuell, keine automatischen Strategien
- **Phase 2 (Wochen 5–12):** Pro Anzeigengruppe Performance prüfen — AG <100 Klicks/Monat zusammenführen oder pausieren
- **Phase 3 (ab Monat 3):** Bei ≥ 15 Conversions/Monat Wechsel zu Target-CPA (Ziel B2B: 60 €, B2C: 5 €)
- **Notbremse:** Bei CPA > 2× Ziel über 2 Wochen → Anzeigengruppe pausieren

---

## 4. Tracking (zu verkabeln vor Go-Live)

- Google-Ads-Conversion-Tag im Frontend einbauen (separater Block)
- `track-conversion` Edge Function erweitern um `gclid`-Aufnahme und Storage
- Enhanced Conversions für Lead-Submit (B2B) — gehashte E-Mail
- GA4-Verlinkung mit Google Ads für Audience-Sharing

Solange das nicht steht, **keine bezahlten Klicks**.