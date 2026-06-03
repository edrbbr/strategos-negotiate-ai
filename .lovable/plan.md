
# Pallanx Retail Shield — Vollständige B2B-Implementierung

## Wichtige Vorab-Hinweise (bitte lesen)

1. **Umfang**: Dieser Plan umfasst ~30–40 neue Dateien, 5–7 Migrationen, 8–10 Edge Functions, eine Landingpage und zwei komplette App-Bereiche (Mandanten-Portal + Owner-Admin). Ich werde das in **einem Build-Durchlauf** umsetzen wie gewünscht — bitte rechne mit längeren Wartezeiten zwischen Schritten und plane Zeit für Review/QA ein. Wenn etwas in Iteration 1 nicht perfekt sitzt, iterieren wir gezielt.
2. **„Komplett getrennte Auth"**: Da Supabase nur EIN `auth.users`-System hat, bedeutet "getrennt" hier: eigene Login-/Register-Seiten unter `/retail/login`, eigene Routen, eigene Guards, eigene `business_users`-Tabelle, die `auth.users.id` referenziert aber sonst NICHTS mit B2C-`profiles` teilt. Ein technisches zweites Auth-System ist auf Supabase nicht möglich, aber UX und Datenmodell sind vollständig isoliert.
3. **Subdomain**: Alles unter `/retail/*`. Wenn du später `retail.pallanx.com` willst, fügst du nur den DNS-Record + ein Host-Rewrite hinzu — kein Code-Change nötig.
4. **Billing**: MVP heißt hier: Tabellen + Admin-UI für manuelle Rechnungserstellung + Stripe-optional-Hook. Echte automatische Stripe-Subscriptions für B2B würden eigene Pricing-Pläne brauchen — sage Bescheid, wenn das auch direkt rein soll.

## Architektur-Überblick

```text
/retail                       (öffentliche Landing)
/retail/login, /register      (B2B-Auth, getrennte Flows)
/retail/app/dashboard         (KPIs für Mandanten)
/retail/app/cases             (Fallliste + Detail + neue Anfrage)
/retail/app/approvals         (Eskalierte Fälle für Manager/Leitung)
/retail/app/settings          (Mandanten-Settings: Limits, Kulanzregeln)
/retail/app/team              (User-Verwaltung innerhalb des Mandanten)
/retail/app/support           (Tickets)
/retail/app/billing           (Rechnungen Mandanten-Sicht)

/admin/b2b                    (Owner: alle Business-Accounts)
/admin/b2b/leads              (eingegangene Lead-Anfragen)
/admin/b2b/:id                (Account-Detail, Settings, User, Billing)
/admin/b2b/tickets            (Support global)
```

## Datenmodell (neue Tabellen, alle mit RLS + GRANTs)

- `b2b_leads` — Lead-Formular der Landing (firma, branche, kontakt, status)
- `business_accounts` — Mandanten (name, branche, anzahl_filialen, billing_email, status, soft-delete)
- `business_users` — Mandanten-User (auth_user_id, business_account_id, role enum, is_primary)
- `business_settings` — pro Mandant (currency, vat, max_discount_limits JSONB pro Rolle, kulanzregeln Text)
- `business_policies` — pro Mandant: hochgeladene Richtlinien (PDF/MD) für RAG
- `business_policy_chunks` — Chunks + Embedding (vector 3072), `business_account_id` indexed
- `business_cases` — Fälle (alle Felder aus Brief: claimed/suggested/final amount, status, approval_role)
- `business_case_logs` — jede AI-Empfehlung + Entscheidung
- `business_approvals` — strukturierte Eskalationsanträge (from_user, to_role, status, decision_notes)
- `business_support_tickets` + `business_support_messages` — Threading
- `business_billing` — billing_model, status, next_invoice_date
- `business_invoices` — generierte Rechnungen
- Enum-Typen: `business_role` (sachbearbeiter|manager|leitung|support_readonly), `business_case_status`, `approval_status`

**Rollen & Security**: 
- Neue SECURITY-DEFINER Function `is_business_member(_user_id, _account_id, _min_role)` für RLS
- Neue Function `get_user_business_account(_user_id)` für Tenant-Resolution
- Bestehende `has_role(_, 'admin')` weiterhin für Owner-Zugriff
- ALLE RLS-Policies scopen strikt auf `business_account_id` → keine Cross-Tenant-Leaks

## RAG-Erweiterung (additiv, bestehender RAG bleibt unverändert)

Neue Funktion `retrieve_business_knowledge(account_id, query_embedding, k)`:
1. Holt Top-K aus `business_policy_chunks` WHERE `business_account_id = account_id` (mandantenspezifisch)
2. Kombiniert mit bestehender `match_knowledge()` (globales Verhandlungswissen)
3. Liefert getrennt zurück: `policy_context` + `global_context` → Prompt zeigt beides mit Quellenangabe

Neue Edge Function `ingest-business-policy` — analog zu `ingest-knowledge-base`, aber mit `business_account_id` als Pflichtparameter und Tenant-Isolation.

## Edge Functions (neu)

- `b2b-lead-submit` — Public, Rate-Limit, schreibt `b2b_leads` + mailt dich (analog `notify-elite-request-admin`)
- `b2b-create-account` — Admin-only: legt Account + Primary Manager an, sendet Einladungs-E-Mail
- `b2b-invite-user` — Manager/Leitung lädt Team-Mitglied in seinen Account ein
- `retail-shield-pipeline` — Kern-Pipeline für Business-Cases:
  1. Lädt Mandanten-Settings (Limits, Regeln)
  2. RAG-Retrieval (Policy + Global)
  3. LLM erzeugt 2–3 Optionen mit Betrag/%/Begründung/Formulierung/`required_role`
  4. Limit-Check gegen User-Rolle
  5. Bei Überschreitung: erzeugt `business_approvals`-Eintrag, setzt Case auf `waiting_approval`
- `b2b-approval-decide` — Manager/Leitung entscheidet (accept/modify/reject)
- `ingest-business-policy` — RAG-Ingest pro Mandant
- `b2b-generate-invoice` — Owner-Action: erzeugt Rechnung
- `b2b-support-reply` — Mail-Notification bei Antworten

## Frontend-Struktur

**Neue Routen** in `App.tsx`: `/retail`, `/retail/login`, `/retail/register`, `/retail/app/*` (mit `BusinessLayout` + `BusinessProtectedRoute` + `BusinessRoleGuard`), `/admin/b2b/*`.

**Neue Components/Pages** (~25 Stück), darunter:
- `pages/retail/Landing.tsx` — Hero, Problem, Lösung, Vorteile, Wie-funktioniert-es, Zielgruppe, Lead-Form
- `pages/retail/RetailLogin.tsx`, `RetailRegister.tsx` (eigene Auth-UI mit Retail-Shield-Branding)
- `components/retail/BusinessLayout.tsx` + `BusinessSidebar.tsx`
- `pages/retail/app/{Dashboard,Cases,CaseDetail,NewCase,Approvals,Team,Settings,Support,Billing}.tsx`
- `pages/admin/b2b/{Overview,AccountDetail,Leads,Tickets,Billing}.tsx`
- `hooks/useBusinessAccount.ts`, `useBusinessRole.ts`, `useBusinessCases.ts`, `useApprovals.ts`

**Design**: Eigenes B2B-Look-Token-Set (seriöser, dunklere/professionellere Akzente als B2C), aber gleiche Design-System-Basis (`index.css`-Tokens), damit Theme-System weiter funktioniert.

## KPI-Berechnung (Dashboard)

DB-View `business_case_kpis` aggregiert pro Account + Zeitraum:
- count cases, sum purchase_price, sum claimed, sum granted
- saved_amount = claimed - granted
- avg_discount_pct
- escalation_rate, % je Rollen-Level

## Billing-UI (Owner + Mandant)

- Owner sieht alle Mandanten mit Status, kann Rechnung erzeugen (PDF via existierender Pattern), als bezahlt markieren
- Mandant sieht seine Rechnungen + Status
- Stripe-Hook bleibt optional (manuelle Rechnung als Default `billing_model='invoice'`)

## Support

- Mandant: Ticket öffnen, Thread sehen, antworten
- Owner: globale Inbox, antworten, Status setzen
- Realtime via `ALTER PUBLICATION supabase_realtime` für Tickets

## Seed-Daten

Migration mit 2 Demo-Accounts ("Demo Baumarkt GmbH", "Demo Möbelhaus AG"), je 1 Manager + 2 Sachbearbeiter, je 5 Fälle inkl. 2 eskalierte, ein Beispiel-Policy-Dokument.

## Reihenfolge der Umsetzung

1. **Migration 1**: Alle Tabellen + Enums + RLS + GRANTs + Helper-Functions + RAG-Tenant-Function
2. **Migration 2**: Seed-Daten + KPI-View
3. **Edge Functions** (alle neuen, parallel deploybar)
4. **Frontend**: Landing → Auth → BusinessLayout → Dashboard → Cases → Approvals → Settings/Team → Support → Billing → Admin-B2B
5. **Verification**: Manuell jeden Flow durchklicken, Build prüfen

## Was bewusst NICHT in dieser Iteration

- Echte automatische Stripe-Subscriptions für B2B (komplexes Pricing, eigene Plans) — Tabellen+UI sind da, Stripe-Verknüpfung folgt wenn du B2B-Preise definiert hast
- E-Mail-Templates für alle B2B-Notifications (nutzen erstmal das bestehende `send-transactional-email`-System mit einfachen Texten; hübsche React-Email-Templates kommen on demand)
- Branchen-spezifische RAG-Inhalte (Architektur ist da, Inhalte fügst du via Policy-Upload hinzu)
- Mehrsprachigkeit B2B-Bereich (erstmal Deutsch wie B2C)

## Risiken / was wahrscheinlich nachjustiert werden muss

- LLM-Prompt für Pipeline muss real getestet werden — Erste Version liefert Vorschläge, Tuning per Iteration
- RLS-Policies sind komplex bei Multi-Tenant + Rollen — bei jedem Fehlerfall (403/leere Listen) muss ich gezielt nachfassen
- Volumen der UI: einige Pages werden in V1 funktional aber visuell schlichter sein, damit Scope einhaltbar bleibt

Wenn das so passt, sag „los" — dann starte ich mit Migration 1.
