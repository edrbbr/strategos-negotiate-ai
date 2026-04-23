

# Stripe Payments aktivieren — Lovable Payments + Managed Tax

## Kontext zur gewählten Variante

- **Provider**: Lovable's Built-in Stripe Payments (kein BYOK)
- **Tax**: `managed_payments` pro Checkout-Session → Stripe agiert als Merchant of Record, übernimmt globales Tax-Filing & Remittance (+3.5% pro Transaktion auf Basis-Stripe-Fees)
- **Wichtig**: Die aktuell in `plan_prices.stripe_price_id` hinterlegten IDs (`price_1TPNF2...` etc.) stammen aus **deinem privaten Stripe-Account** und werden hier **nicht verwendet**. Lovable Payments legt eigene Products/Prices an, die wir dann in die DB schreiben.

## Phase 1 — Eligibility-Check & Aktivierung

1. `recommend_payment_provider` ausführen — STRATEGOS als deutsches B2B-SaaS sollte clean durchgehen
2. `enable_stripe_payments` aufrufen
   - Test-Environment ist sofort verfügbar
   - Webhook-Endpoint wird automatisch erzeugt + bei Stripe registriert
   - `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` werden automatisch in Supabase-Secrets hinterlegt
   - Test-Karten funktionieren sofort, kein Account-Claim für Testing nötig

## Phase 2 — Products + Prices in Lovable Payments anlegen

1. **`batch_create_product`** für die kostenpflichtigen Tiere:
   - **Pro** → 2 Prices: 49,00 €/Monat + 468,00 €/Jahr (entsprechen aktueller DB)
   - **Elite** → 2 Prices: 199,00 €/Monat + 1788,00 €/Jahr
   - Pro Product: passender Stripe Tax Code (digitales SaaS-Abo, z.B. `txcd_10103001`)
2. **DB-Update** auf `plan_prices`: Die neuen `stripe_price_id`-Werte aus Lovable Payments überschreiben die alten IDs aus deinem privaten Konto
   - 4 UPDATE-Statements via insert tool (nicht Migration, da Daten-Update)

## Phase 3 — Edge Function `stripe-checkout`

Neue Function `supabase/functions/stripe-checkout/index.ts`:

- **Input**: `{ price_id: string }` (UUID aus `plan_prices`, nicht Stripe-ID — wird server-seitig nachgeschlagen)
- **Auth**: JWT-Validation via `getClaims()`
- **Flow**:
  1. Plan-Price aus DB laden (inkl. `stripe_price_id`)
  2. Profile laden, `stripe_customer_id` prüfen
  3. Falls noch kein Customer: `stripe.customers.create({ email, metadata: { user_id } })`, `stripe_customer_id` in profiles schreiben
  4. `stripe.checkout.sessions.create` mit:
     - `mode: 'subscription'`
     - `customer: stripe_customer_id`
     - `line_items: [{ price: stripe_price_id, quantity: 1 }]`
     - `managed_payments: { enabled: true }` ← Full Compliance
     - `success_url: ${origin}/app/dashboard?checkout=success`
     - `cancel_url: ${origin}/preise?checkout=cancel`
     - `metadata: { user_id, plan_id, billing_cycle }`
  5. Response: `{ checkout_url }`
- **CORS** + Error-Handling (Stripe-Errors als 400 zurück)

## Phase 4 — Edge Function `stripe-webhook`

Neue Function `supabase/functions/stripe-webhook/index.ts` mit `verify_jwt = false` (Eintrag in `supabase/config.toml`):

- **Signature-Validation** via `STRIPE_WEBHOOK_SECRET` und `stripe.webhooks.constructEvent`
- **Service-Role-Client** für DB-Updates (bypasst RLS-Restriktionen auf `profiles.plan_id`)
- **Events**:
  - `checkout.session.completed` → `profiles.plan_id`, `billing_cycle`, `subscription_status='active'`, `cases_used = 0` (Reset bei Upgrade)
  - `customer.subscription.updated` → `subscription_status`, evtl. `plan_id`-Wechsel via Stripe-Price-Lookup zurück auf unsere `plans`
  - `customer.subscription.deleted` → `plan_id='free'`, `subscription_status='canceled'`
  - `invoice.payment_failed` → `subscription_status='past_due'`
- Idempotenz via Stripe Event-ID (kleine `processed_stripe_events`-Tabelle, primary key = event_id)

## Phase 5 — DB-Migration: RLS-Policy für Plan-Updates anpassen

Aktuelle RLS-Policy auf `profiles` blockt `plan_id`/`cases_used`/`subscription_status`/`stripe_customer_id`-Änderungen durch User. Das ist korrekt und bleibt — der Webhook nutzt Service-Role-Key, der RLS bypasst. Keine Policy-Änderung nötig.

Neue Tabelle `processed_stripe_events`:
```
id              text primary key   -- Stripe event id
event_type      text not null
processed_at    timestamptz default now()
```
RLS aktiv, keine Policies (nur Service-Role schreibt).

## Phase 6 — Frontend-Verkabelung

**`src/pages/Pricing.tsx`**:
- Free-Button bleibt → `/register`
- Pro/Elite-Buttons: bei eingeloggtem User → `supabase.functions.invoke('stripe-checkout', { body: { price_id } })` → `window.location.href = checkout_url`
- bei nicht eingeloggtem User → `/register?intent=checkout&price_id=...` (Login-Intent persistieren, nach Login auto-checkout)

**`src/components/UpgradeModal.tsx`**:
- "PRO WERDEN"-Button identisch verkabelt (price_id = monthly Pro)
- Loading-State während Function-Call (Button disabled + Spinner)

**`src/pages/Dashboard.tsx`**:
- `useSearchParams`: bei `?checkout=success` → Toast "Willkommen im Sovereign-System", `useProfile`-Cache invalidieren, Param aus URL entfernen
- bei `?checkout=cancel` (auf /preise) → dezenter Toast "Checkout abgebrochen"

**`src/pages/Settings.tsx`** (falls Tab "Plan" existiert; sonst neu):
- Aktueller Plan + Status anzeigen
- Button "Plan verwalten" → ruft optionale Function `stripe-portal` (Stripe Billing Portal Session)
- Bei Free-User: "Jetzt upgraden" → `/preise`

## Phase 7 — Optionale Function `stripe-portal` (empfohlen)

Kurze Function die `stripe.billingPortal.sessions.create({ customer: stripe_customer_id, return_url })` aufruft. Liefert URL zurück, Frontend redirected. Nutzer kann Karte ändern, kündigen, Rechnungen sehen — alles ohne dass wir UI bauen müssen.

## Phase 8 — Test-Plan

1. Test-Karte `4242 4242 4242 4242` → Pro-Checkout durchführen
2. Webhook-Log prüfen: `checkout.session.completed` empfangen, `profiles.plan_id` = 'pro'
3. CaseDetail testen: AI-Router liefert jetzt Claude Sonnet 4.5 (Pro-Pfad)
4. Im Stripe-Dashboard Subscription canceln → Webhook setzt `plan_id='free'` zurück
5. Failed-Payment simulieren (Test-Karte `4000 0000 0000 0341`) → `subscription_status='past_due'`

## Akzeptanzkriterien

- [ ] Lovable Payments (Stripe) aktiv, Webhook automatisch registriert
- [ ] Pro + Elite Products mit je 2 Prices in Stripe angelegt
- [ ] `plan_prices.stripe_price_id` mit Lovable-Payments-IDs überschrieben
- [ ] `stripe-checkout` Edge Function deployed, erzeugt Session mit `managed_payments`
- [ ] `stripe-webhook` Edge Function deployed, Signature-Validation aktiv
- [ ] Webhook updated `profiles.plan_id` korrekt nach erfolgreichem Checkout
- [ ] Idempotenz via `processed_stripe_events` verhindert Doppel-Verarbeitung
- [ ] Pricing-Seite + UpgradeModal triggern Stripe-Checkout
- [ ] Dashboard zeigt Success-Toast nach Redirect
- [ ] Settings hat "Plan verwalten"-Link zum Stripe Customer Portal
- [ ] Multi-Stage-Pipeline funktioniert nach Upgrade auf Elite ohne Code-Änderung
- [ ] TypeScript-Build grün

## Was NICHT in diesem Schritt ist

- Kein eigenes Invoicing-UI (Stripe Customer Portal deckt das ab)
- Kein A/B-Testing auf Pricing
- Keine Custom-Dunning-Logik (Stripe Smart Retries reichen)
- Kein Proration-Handling beim Plan-Wechsel im UI (Stripe macht das automatisch)
- Kein Anbinden deiner alten Stripe-Price-IDs aus dem Privatkonto — die werden überschrieben

## Was du nach Genehmigung tun musst

Nichts manuell. Lovable Payments läuft automatisch — du kannst optional später deinen Lovable-Payments-Account "claimen" um Auszahlungen zu erhalten (Anweisungen erscheinen im Lovable-UI nach Aktivierung).

