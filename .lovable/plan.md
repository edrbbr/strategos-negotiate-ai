

# Fix: `create-checkout` muss userId verifizieren

## Schwachstelle
`supabase/functions/create-checkout/index.ts` akzeptiert `userId` aus dem Request-Body und setzt ihn als `metadata.userId` in der Stripe-Session. Ohne JWT vertraut die Funktion einfach dem, was im Body steht. Da `payments-webhook` per `metadata.userId` Subscriptions auf `profiles` schreibt, kann ein nicht-authentifizierter Caller mit einer beliebigen User-ID eine Subscription auf ein fremdes Konto buchen (oder einem anderen Konto eine Test-Subscription „aufzwingen").

## Fix-Strategie
**Server-Seite ist die einzige Source of Truth für `userId`.** Body-`userId` wird komplett ignoriert; gleiches gilt für `customerEmail`, sobald ein verifizierter User vorliegt (verhindert Spoofing der Käufer-Mail).

### Änderungen in `supabase/functions/create-checkout/index.ts`
1. **Body-Schema entrümpeln**: `userId` aus dem destrukturierten Body entfernen. Wir lesen ihn nicht mehr aus dem Request.
2. **Auth-Header parsen** (wie bisher) via `supabase.auth.getClaims(token)`.
   - Bei vorhandenem **gültigen** Token → `resolvedUserId = claims.sub`, `resolvedEmail = claims.email` (überschreibt body-Email).
   - Bei vorhandenem, aber **ungültigem** Token → `401 Unauthorized` (heute wird der Fehler stillschweigend verschluckt).
3. **Anonymer Checkout bleibt erlaubt** — nur ohne `userId`-Metadata. Das deckt Gast-Checkouts (One-time-Payments) ab und verhindert, dass der Webhook die Session einem User zuschreibt.
4. **`customerEmail` aus dem Body** wird nur noch verwendet, wenn KEIN Auth-Header anliegt. Mit Auth gewinnt immer die JWT-Email.
5. Stripe-Session-Erstellung unverändert, aber `metadata.userId` wird ausschließlich aus dem verifizierten Claim gesetzt.

### Änderungen im Client
6. `src/components/StripeEmbeddedCheckout.tsx`: `userId` aus dem Body-Payload des `functions.invoke("create-checkout", …)`-Aufrufs entfernen (er wird ohnehin ignoriert; sauber halten).
7. `src/hooks/useStripeCheckout.tsx`: `userId` aus `CheckoutOptions`-Interface entfernen.
8. Aufrufer (`src/pages/Pricing.tsx`, `src/components/UpgradeModal.tsx`): `userId`-Property aus `openCheckout({…})` entfernen. Der eingeloggte User wird serverseitig aus dem JWT abgeleitet, nicht mehr clientseitig durchgereicht.

### Edge-Function-Konfiguration
`supabase/config.toml` bleibt unverändert (`verify_jwt = false`), weil:
- Anonyme One-Time-Payments weiter erlaubt sein sollen,
- die CORS-Preflight-Reqs nicht durch Gateway-401 abgewiesen werden dürfen,
- die Auth-Validierung jetzt **in der Funktion** stattfindet (Pflicht-Pattern für Stripe-Functions laut Knowledge).

## Akzeptanzkriterien
- Body-`userId` wird vollständig ignoriert; Mit/Ohne JWT.
- Mit gültigem JWT: `metadata.userId === claims.sub`, Email aus Claims.
- Mit ungültigem/abgelaufenem JWT: HTTP 401, keine Stripe-Session.
- Ohne JWT: Session ohne `metadata.userId` (Gast-Checkout, kein Profile-Mapping im Webhook).
- Pricing-Page und Upgrade-Modal funktionieren weiterhin für eingeloggte User (Subscription wird korrekt dem JWT-User zugeordnet).
- Bestehender `payments-webhook` braucht keine Änderungen — er nutzt `metadata.userId` weiter, die jetzt aber garantiert vertrauenswürdig ist.

## Dateien
| Datei | Änderung |
|---|---|
| `supabase/functions/create-checkout/index.ts` | `userId` aus Body entfernen; 401 bei ungültigem JWT; Email-Override aus Claims |
| `src/components/StripeEmbeddedCheckout.tsx` | `userId`-Prop & Body-Feld entfernen |
| `src/hooks/useStripeCheckout.tsx` | `userId` aus `CheckoutOptions` entfernen |
| `src/pages/Pricing.tsx` | `userId` aus `openCheckout`-Call entfernen |
| `src/components/UpgradeModal.tsx` | `userId` aus `openCheckout`-Call entfernen |

## Nicht enthalten
- Änderungen am `payments-webhook` (Vertragsschnittstelle bleibt gleich).
- Neue UI für Gast-Checkout (One-Time-Payments unterstützen das bereits implizit).
- Rate-Limiting / Abuse-Protection auf der Funktion (separater Task).

