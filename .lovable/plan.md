

# Fix: Plan-Anzeige nach Stripe-Checkout korrekt + Verwirrende Tier-Labels

## Was tatsächlich passiert ist

Erst die Fakten aus der DB — der wichtige Teil:

- **Deine Subscription ist aktiv**: `elite_monthly`, Status `active`, sauber in der DB
- **Dein Profil ist korrekt aktualisiert**: `plan_id = 'elite'`, `billing_cycle = 'monthly'`, `subscription_status = 'active'`
- **Der Webhook hat funktioniert**, der Trigger `sync_profile_from_subscription` hat alles richtig gemacht

Du hast aber **nicht den Pro-Plan, sondern den Elite-Plan** gekauft (`elite_monthly` in der Subscription, nicht `pro_monthly`). Das ist erstmal nur eine Beobachtung — wenn du Pro wolltest, müssten wir die Subscription canceln und neu kaufen. Sag Bescheid.

## Warum du "Basis" siehst, obwohl du Elite hast

Drei Probleme treffen zusammen:

1. **Verwirrende Tier-Labels in der DB**:
   - `free` → tier_label `"BASIS"`
   - `pro` → tier_label `"SOUVERÄN"`
   - `elite` → tier_label `"DIPLOMAT"`
   Das tier_label ist NICHT der Plan-Name. In `AppLayout` zeigen wir `profile.plan.tier_label`. Du würdest also bei Elite "DIPLOMAT" sehen, bei Pro "SOUVERÄN" — nirgends "Pro" oder "Elite". Verständlich, dass das nach "irgendwas mit Basis stimmt nicht" aussieht.

2. **Fallback-Anzeige**: In `src/components/AppLayout.tsx:29` steht:
   ```ts
   const tier = profile?.plan?.tier_label ?? "BASIS";
   ```
   Wenn `profile.plan` aus irgendeinem Grund kurzzeitig `null` ist (z.B. weil das Profile geladen ist, der `plans!inner`-Join im AuthContext aber noch nicht zurück ist, oder beim Reload vor dem Webhook-Sync), zeigt die UI hartkodiert "BASIS" — auch wenn der User in Wirklichkeit Elite ist.

3. **Race-Condition zwischen Stripe-Redirect und Webhook**: Dashboard ruft `refreshProfile()` 3× im Abstand von 500/1500/4000ms. Der Stripe-Webhook braucht aber gelegentlich länger als 4 Sekunden für die Verarbeitung. Wenn er erst nach 6s ankommt, hast du einen veralteten `profile.plan_id = 'free'` im UI und es bleibt so bis zum manuellen Reload.

## Was wir fixen

### 1) Tier-Labels umbenennen — klare Namen statt Fantasie

In der DB-Tabelle `plans` die `tier_label`-Werte updaten:
- `free` → `"FREE"` (statt "BASIS" — du hast es selbst angemerkt)
- `pro` → `"PRO"` (statt "SOUVERÄN")
- `elite` → `"ELITE"` (statt "DIPLOMAT")

Die ursprünglichen Codenamen "SOUVERÄN" / "DIPLOMAT" können wir auf der Pricing-Seite als Tagline behalten falls gewünscht, aber im UI-Header soll der echte Plan-Name stehen.

### 2) Fallback-Anzeige reparieren

In `src/components/AppLayout.tsx` den Fallback ändern: statt hartkodiert "BASIS" rendern wir den `plan.name` oder warten auf `profile.plan` mit einem dezenten Skeleton. Konkret: Wenn `profile` lädt → kleiner Spinner/Skeleton, wenn `profile.plan` da ist → `plan.tier_label` (jetzt korrekt), niemals statisches "BASIS".

### 3) Robustere Polling-Logik nach Checkout-Success

In `src/pages/Dashboard.tsx` das aktuelle 3×-Refresh durch echtes Polling ersetzen:
- Bis zu 10 Versuche im 1.5s-Abstand (max. 15s)
- Stoppen sobald `profile.plan_id !== 'free'` oder Subscription in DB sichtbar
- Fallback-Toast nach 15s falls Webhook gar nicht ankommt: "Aktivierung dauert länger als üblich. Bitte Seite neu laden in einigen Sekunden."

Damit eliminieren wir die Race-Condition komplett — selbst wenn Stripe 8 Sekunden braucht, sieht der User am Ende den richtigen Plan.

### 4) Optional: Plan-Status prominent im Header anzeigen

Zusätzlich im `AppSidebar` oder `AppLayout` einen kleinen "Plan: Elite" Badge mit klickbarem Link zu Settings → Plan verwalten. So sieht der User sofort wo er steht und kann Stripe-Portal öffnen falls er die Subscription canceln/wechseln will.

## Was wir NICHT machen

- Keine Änderung an Webhook-Logik (funktioniert wie gewünscht)
- Keine Änderung an Trigger oder DB-Schema (nur Daten-Update auf `plans.tier_label`)
- Keine Stornierung deiner Elite-Subscription — wenn du eigentlich Pro wolltest, sag Bescheid und ich hänge einen Folge-Schritt dran (Stripe Portal Link öffnen → cancel → neuer Pro-Checkout)

## Akzeptanzkriterien

- [ ] In `plans` heißen die `tier_label` jetzt FREE / PRO / ELITE
- [ ] AppLayout zeigt nie hartkodiert "BASIS", sondern entweder Skeleton oder den echten Plan-Namen
- [ ] Nach `?checkout=success` wird das Profile bis zu 15s lang gepollt bis Plan != free
- [ ] Wenn Webhook länger braucht als 15s erscheint Hinweis-Toast
- [ ] Nach Reload sieht User korrekt "ELITE" statt "BASIS"

## Frage an dich

Wolltest du **Pro** kaufen (49€/Monat) statt Elite (199€/Monat)? Wenn ja: nach diesem Fix führe ich dich durchs Stripe-Portal um die Elite-Subscription zu canceln, dann checkout für Pro neu. Sag einfach "ja, war versehen". Wenn Elite gewollt war: nach dem Fix siehst du sauber "ELITE" im Header und alles ist gut.

