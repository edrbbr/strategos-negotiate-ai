# SEA — Go-Live-Checkliste

**Status: keine Kampagne ist aktiv.** Bevor irgendein Klick bezahlt wird, müssen alle Punkte unten grün sein.

## A. Konto & Abrechnung

- [ ] Google-Ads-Konto auf Pallanx GmbH (oder Inhaber) eröffnet
- [ ] Rechnungsadresse, USt-ID hinterlegt
- [ ] Zahlungsmethode (SEPA-Lastschrift bevorzugt)
- [ ] Konto-Budget-Cap pro Monat hart eingestellt
- [ ] 2FA für Konto-Login aktiv
- [ ] Mindestens 2 Admin-User

## B. Tracking (Pflicht vor Klick #1)

- [ ] GA4-Property aktiv, mit Google Ads verknüpft
- [ ] Conversion-Aktion "B2B Lead Submit" definiert
- [ ] Conversion-Aktion "B2C Magazin → Pricing" definiert
- [ ] Google-Ads-Conversion-Tag im Frontend eingebaut (gtag oder GTM)
- [x] `gclid`/`fbclid`-Capture in `src/lib/utm.ts` aktiv, persistiert 30 Tage
- [x] `track-conversion` Edge Function speichert UTM + Click-IDs im `utm` JSONB-Feld
- [x] `initGtag()` aus `useUtmCapture` aufgerufen, hart gegen `pallanx-cookie-consent.marketing` gegated
- [ ] Enhanced Conversions für Lead-Submit (gehashte E-Mail) konfiguriert
- [ ] Test-Lead mit eigenem Browser → Conversion erscheint in Google Ads (T+24 h)

## C. Landingpage-Match

- [ ] Jede Anzeigengruppe verweist auf konsistente Landingpage (siehe `sea-ad-drafts.md`)
- [ ] UTM-Parameter konsistent pro Kampagne/Anzeigengruppe
- [ ] Page-Speed < 2,5 s LCP auf allen Ziel-Landingpages (Mobile)
- [ ] CWV (LCP, CLS, INP) im grünen Bereich (Search Console PageSpeed Insights)
- [ ] Mobile Layout 360 px sauber, Form sichtbar ohne Scroll
- [ ] Datenschutzlink im Footer, Impressum komplett
- [ ] Cookie-Consent-Banner blockiert Tracking-Scripts vor Einwilligung

## D. Kampagnen-Konfiguration

- [ ] Negativlisten global + kampagnenspezifisch (siehe `sea-keywords.md`)
- [ ] Standort-Targeting **Deutschland** (nicht "Interesse an DE" → echte DE-Nutzer)
- [ ] Sprache Deutsch
- [ ] Geräte-Bid-Modifier eingestellt (B2C mobile −10 %, B2B mobile −20 %)
- [ ] Werbezeitplan B2B Mo–Fr 08–18 Uhr +25 %
- [ ] Auto-Apply Empfehlungen **deaktiviert**
- [ ] Suchpartner-Netzwerk **deaktiviert** (erst nach Datenbasis)
- [ ] Display-Netzwerk **deaktiviert**
- [ ] Gebotsstrategie Manual CPC, Cap je nach AG
- [ ] Tages- und Monatsbudget je Kampagne (siehe `sea-account-structure.md`)

## E. Ad-Compliance

- [ ] Markenrichtlinien geprüft (keine fremden Marken im Anzeigentext)
- [ ] Keine "garantiert"-Aussagen
- [ ] Keine Suggestion einer Rechtsberatung
- [ ] Anzeigentexte freigegeben durch [Verantwortlicher]

## F. Reporting & Reviews

- [ ] Wöchentliches Review-Meeting (15 Min., Mo)
- [ ] Monatlicher Review (1 h, jeweils 1. Werktag)
- [ ] Such-Anfragen-Bericht in Woche 1 täglich, danach 2×/Woche
- [ ] Notbremse-Regel dokumentiert (CPA > 2× Ziel über 2 Wochen → Pause)
- [ ] Zugriff auf Konto für Geschäftsführung als "Standard-Zugriff" (nicht Admin)

## G. Nicht-vergessen

- [ ] IP-Ausschluss Eigene Büro-IP / Home-Office-IP (verhindert Selbstklicks)
- [ ] Excluded Audiences: bestehende Kunden, eigene Mitarbeiter (Customer-Match-Liste)
- [ ] Robots.txt erlaubt `Googlebot-Image`, blockiert nicht versehentlich `/retail/*`
- [ ] Test mit "View only" Konto: kann das Reporting gelesen werden?
- [ ] Backup-Doku: Welcher Mensch hat Zugriff, wer wird informiert bei Notfall?

---

## Nicht starten, wenn …

- Conversion-Tracking nicht live (B blockiert alles andere)
- Landingpages mobil > 3 s LCP
- Cookie-Consent nicht implementiert
- Verantwortliche Person für Daily-Review nicht benannt
- Monats-Budget-Cap nicht hart eingestellt