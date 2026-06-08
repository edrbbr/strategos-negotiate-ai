---
name: Pallanx Retail Shield – reale Features
description: Was das Produkt heute wirklich kann; Basis für wahrheitsgemäße Marketing-Texte
type: feature
---
Stand: Block 7 (Single-Recommendation + Custom-Roles + Industries).

VORHANDEN (darf behauptet werden):
- Strukturierte Fallerfassung via RetailNewCase (Produkt, Preis, Menge, Kundenforderung, Kanal, Situation, Notizen)
- KI-Pipeline `retail-shield-pipeline`: Kurzanalyse, Risiko-Assessment, GENAU EINE Empfehlung mit Begründung + Kunden-Wortlaut + vollständigem E-Mail-Entwurf + Konfidenz. Ziel: kleinstmögliches Zugeständnis, mit dem der Kunde sich noch als Gewinner fühlt — Limits sind Obergrenzen, nicht Default.
- Branchen-Kontext: Tabelle `industries` (admin-pflegbar via Picklist + Inline-Add). Pipeline injiziert branchenspezifische Leitplanken (BGB-Hebel, typische Fälle).
- Rollen-/Limit-Prüfung serverseitig (Sachbearbeiter/Manager/Leitung) mit konfigurierbaren max_discount_limits PLUS frei definierbare Custom-Rollen pro Mandant (`business_custom_roles`, eigenes Limit, Basis-Rolle für RLS). Helper `effective_discount_limit(user, account)` einheitlich überall.
- Manueller Abschluss via Close-Modal mit Euro-Eingabe mit Komma (de-DE). Auto-Berechnung Prozent + Ersparnis-Anzeige. Limit-Check serverseitig.
- Reopen-Funktion: Manager/Leitung können geschlossene Fälle wieder öffnen (Status → in_review, closed_at=null, Log-Eintrag).
- Explizites „Genehmigung einholen" (immer sichtbar) für Sachbearbeiter — legt business_approvals an, setzt Fall auf In Eskalation.
- RAG auf mandanten-eigene Richtlinien (`match_business_knowledge`) + globales Verhandlungswissen (`match_knowledge`)
- Versionshistorie pro Fall (`business_case_versions`, V1 initial + Refinement-Versionen) + Aktionslog (`business_case_logs`)
- Refinement-Chat zum Nachschärfen
- Mandant kann eigene Kulanzregeln als Freitext + Policy-Dokumente hinterlegen

NICHT VORHANDEN (darf NICHT behauptet werden, bis gebaut):
- Frist-/Deadline-Tracker (kein deadline/due_date Feld, keine Reminder, keine Verzugs-Eskalation)
- Revisionssicherheit i.S.v. GoBD (kein WORM, kein Hash-Chain, keine Aufbewahrungslogik) → stattdessen "lückenlose Versions- und Aktionshistorie"
- Auto-Anlage von Vorgängen (Eingabe ist manuell)
- Auto-Erkennung von Kauf- vs. Werkvertrag als strukturiertes Feld (nur über KI-Analyse im Freitext)
- E-Mail-Reminder, SLA-Tracking, Eskalation bei Ablauf
- Spedition-Schnittstellen, Hersteller-Garantie-Workflows
