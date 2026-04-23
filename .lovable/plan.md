

# Fixes: Login-Navigation, Google-Auth Hänger, Pricing-CTAs + Stripe Tax-Code

Vier saubere, voneinander unabhängige Korrekturen. Plus ein Bonus-Fix für den aktuellen Stripe-Runtime-Error (Tax-Code fehlt auf Products), der jeden Pro/Elite-Checkout sofort blockt.

## 1) Login + Register: Zurück zu Home

**Problem**: Auf `/login` und `/register` führt nichts zurück zur Landing-Page. Im Login-Header existiert gar kein Logo/Home-Link, im Register ebenso.

**Fix**:
- `src/pages/Login.tsx`: Linke Spalte — der bereits importierte `<Logo />` wird in einen `<Link to="/">` gewickelt. Zusätzlich auf der rechten Spalte (mobile) ein dezenter "Zurück zur Startseite"-Link über der Überschrift einfügen, damit auch auf Mobile klar ist wie man rauskommt.
- `src/pages/Register.tsx`: Identisches Pattern — Logo in linker Spalte als Link zu `/`, mobile-tauglicher Back-Link rechts.

## 2) Google-Sign-In: Hänger nach Klick

**Problem**: User klickt "Google Identification" auf `/register`, Button-Spinner dreht ewig, nichts passiert. Ursache: `lovable.auth.signInWithOAuth` liefert ein Result mit `redirected: true` zurück, der Code in `AuthContext.signInWithGoogle` ignoriert das aber komplett — er prüft nur `result.error`. In den Pages bleibt `loading=true` hängen, weil weder Error noch Redirect-Pfad den Spinner stoppt. Außerdem zeigen die Auth-Logs (siehe useful-context), dass Google-Login auf `strategos-negotiate-ai.lovable.app` erfolgreich durchläuft, aber die User auf `81024eb9-...lovableproject.com` zurückkommen — die Redirect-URL stimmt nicht mit dem Origin überein, von dem die OAuth-Initiation startete.

**Fix**:
- `src/contexts/AuthContext.tsx`: `signInWithGoogle` erweitern um `redirected`-Flag-Handling. Returned `{ error, redirected }`. Bei `redirected: true` macht der Browser den Redirect — UI-State muss man nicht zurücksetzen (Page wird ohnehin entladen).
- `src/pages/Login.tsx` + `src/pages/Register.tsx`: `handleGoogle` setzt `loading=false` nur wenn weder Error noch Redirect — sonst lässt es den Spinner stehen bis Browser navigiert. Bei Error wird Spinner gestoppt + `error` State gesetzt.
- Zusätzliche Diagnose: Console-Log im Catch-Path damit wir sehen, falls die OAuth-Bibliothek silent failed.

## 3) Pricing: CTA-Texte + Free-Button-Logik

**Problem laut User**: "Für Free und Elite steht nur 'kontaktieren'". Im aktuellen Code stehen aber `STARTEN` (Free), `JETZT SICHERN` (Pro), `ELITE WERDEN` (Elite). Vermutlich sieht der User noch eine ältere gecachte Version, oder die Cards rendern bei fehlenden Daten falsch. Tatsächliches Verhalten-Problem: Free-Button ist immer ein `<Link to="/register">` — auch wenn User bereits eingeloggt ist. Sollte dann zu `/app/case/new` navigieren.

**Fix in `src/pages/Pricing.tsx`**:
- Free-CTA-Logik:
  - Nicht eingeloggt → `/register` (wie heute)
  - Eingeloggt → `/app/case/new` (direkt zur Fallerstellung)
- CTA-Labels expliziter formulieren falls User wirklich was anderes sieht: "STARTEN" → "KOSTENLOS STARTEN", "ELITE WERDEN" → "ELITE FREISCHALTEN" — dann ist klar dass kein Kontaktformular gemeint ist.
- Den Helper `ctaLabelFor` erweitern um zusätzlich "ANGEMELDET? FALL STARTEN" für eingeloggte Free-User anzuzeigen.

## 4) Stripe Tax-Code (Runtime-Error blockt Checkout aktuell komplett)

**Problem**: Aktueller Runtime-Error beim Klick auf einen Pro/Elite-Button:
> "Invalid line_items[0]: the product tax code is missing. You must set the product's tax_code to one eligible for Managed Payments."

Die in Phase 2 angelegten Products haben keinen Stripe Tax-Code, daher lehnt `managed_payments` jeden Checkout ab. Das ist der Grund warum oben in der Pricing-Seite gar nichts passiert wenn User auf einen Plan klickt.

**Fix**: Über die Payments-Tools die existierenden Products `pro_plan` und `elite_plan` updaten — `tax_code: 'txcd_10103001'` setzen (Standard für Software as a Service - Cloud-based, eligible für Managed Payments). Das ist eine Stripe-API-Aktion, kein Code-Change.

## 5) Bekannte Console-Warnings (nice-to-fix)

Aus den console-logs:
- `StripeEmbeddedCheckout` braucht `forwardRef` — derzeit warnt React weil die Komponente einen Ref bekommt. Wir wrappen `StripeEmbeddedCheckoutComponent` mit `React.forwardRef`.
- `DialogContent` braucht `DialogTitle` — wir fügen einen visually-hidden `<DialogTitle>Checkout</DialogTitle>` und `<DialogDescription>` für a11y hinzu.

## Akzeptanzkriterien

- [ ] Logo auf `/login` und `/register` ist klickbar, navigiert zu `/`
- [ ] Sichtbarer "Zurück"-Link auch auf Mobile
- [ ] Google-Button auf `/register` & `/login`: Klick führt entweder zu Google-Redirect oder zeigt Error — kein endloser Spinner mehr
- [ ] Free-Plan-CTA: Nicht eingeloggt → `/register`. Eingeloggt → `/app/case/new`
- [ ] CTA-Labels eindeutig formuliert (kein "kontaktieren")
- [ ] Pro & Elite Products in Stripe haben `tax_code: txcd_10103001`
- [ ] Klick auf Pro/Elite-Button öffnet das Embedded-Checkout-Dialog ohne Fehler
- [ ] Keine React-Warnings mehr für forwardRef / DialogTitle

## Was NICHT in diesem Schritt ist

- Keine Änderung an Auth-Flow-Logik (Login mit Email/Password bleibt unverändert)
- Keine neuen Stripe-Products (wir patchen die existierenden)
- Keine Settings-Page-Anpassungen
- Kein Anbinden der `intent=checkout`-Auto-Redirect-Logik nach Register (separater Folge-Prompt falls gewünscht)

