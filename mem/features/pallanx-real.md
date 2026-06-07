---
name: Pallanx Retail Shield – reale Features
description: Was das Produkt heute wirklich kann; Basis für wahrheitsgemäße Marketing-Texte
type: feature
---
Stand: Block 2a.

VORHANDEN (darf behauptet werden):
- Strukturierte Fallerfassung via RetailNewCase (Produkt, Preis, Menge, Kundenforderung, Kanal, Situation, Notizen)
- KI-Pipeline `retail-shield-pipeline`: Kurzanalyse, Risiko-Assessment, 3 abgestufte Optionen (konservativ/mittel/kulant) mit amount_eur, percent, rationale, customer_wording
- Rollen-/Limit-Prüfung serverseitig (Sachbearbeiter/Manager/Leitung) mit konfigurierbaren max_discount_limits → Auto-Eskalation `business_approvals` bei Überschreitung
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
