
# Light/Dark Mode Umsetzung

Standard: **Light Mode** (Look & Feel der Elite-E-Mail-Einladung). Wer eingeloggt ist, kann seine Wahl persistieren — sowohl per Quick-Switch im Header/Sidebar als auch in den Settings.

---

## Phase 1 — Light-Mode Design-Tokens (Email-Look)

**Datei: `src/index.css`**

Aus der Mail-Vorlage `elite-offer.tsx` extrahierte Palette:
- Background page: `#ffffff` → Container `#fafafa` (Off-White Surface)
- Foreground/Text: `#1a1a1a`
- Primary (Gold): `#a4863e`
- Muted-Text: `#666666`
- Subtle/Hint: `#999999`
- Borders: `#e5e5e5`
- Card: `#ffffff` mit `border-left: 3px solid #a4863e`

Umsetzung:
- **`:root`** wird auf den **Light Mode** umgeschrieben (HSL-Konvertierung der obigen Hex-Werte). Damit ist Light Mode der „kein-class"-Default.
- Die bisher in `:root` stehende Dark-Palette wird in **`.dark`** verschoben (bleibt 1:1 erhalten).
- Sidebar-Token bekommen ebenfalls Light-Varianten (heller Off-White `#f5f4f0`-artig, mit goldenem Border).
- `body` behält `bg-background text-foreground` (kein hardcoded `dark`).
- Scanline-Background (`scanline-bg`) bekommt eine sanftere Light-Variante.

→ Da alle Components `hsl(var(--…))` nutzen, schlägt der Theme-Wechsel automatisch durch.

## Phase 2 — Theme-Provider & Persistenz

**Neu: `src/contexts/ThemeContext.tsx`**
- Verwaltet `theme: "light" | "dark"`, `setTheme`, `toggleTheme`.
- Initialisierung (Reihenfolge):
  1. Wenn eingeloggt + `profile.theme_preference` gesetzt → das nehmen.
  2. Sonst: `localStorage.getItem("pallanx-theme")`.
  3. Sonst: **`"light"`** (Standard laut Anforderung — bewusst KEIN System-Preference, weil User Light bevorzugt).
- Setzt/entfernt die `dark`-Klasse auf `document.documentElement`.
- `setTheme()`:
  - schreibt immer in `localStorage`,
  - wenn eingeloggt → `UPDATE profiles SET theme_preference = …` und `refreshProfile()`.

**Anti-Flash:** Inline-Script in `index.html` `<head>`, das vor React-Mount `localStorage` liest und ggf. sofort `dark` auf `<html>` setzt. So gibt es keinen weißen Blitz beim Reload für Dark-Mode-User.

**Provider-Einbindung:** in `src/App.tsx` `<ThemeProvider>` direkt unter `<AuthProvider>` (damit auf `profile` reagiert werden kann).

## Phase 3 — DB-Migration für Persistenz

Spalte zu `profiles` hinzufügen:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference text
  CHECK (theme_preference IN ('light','dark'));
```

- Default bewusst NULL → bedeutet „nutzt System-Default = Light".
- Bestehende RLS-Policies decken Update via `id = auth.uid()` bereits ab (kein Policy-Change nötig).
- `AuthProfile` Type + `PROFILE_SELECT` in `AuthContext.tsx` werden um `theme_preference` erweitert.

## Phase 4 — UI: Toggle-Komponente & Platzierung

**Neu: `src/components/ThemeToggle.tsx`**
- Eine kleine, dezent-edle Pill mit `Sun`/`Moon` Icon (lucide), `variant="ghost"`-Style passend zum Brand.
- Nutzt `useTheme()`; bei Klick sofort optisch + persistent.
- Zwei Größen via Prop: `compact` (Icon-only, für Header/Sidebar) und `full` (mit Label, für Settings).

**Platzierungen** — bewusst nur dort, wo es Designkonventionen erfüllt:

1. **`PublicHeader.tsx`** — kompaktes Icon links neben „Login" / „Mein Mandat" Block. Sichtbar für Gäste & eingeloggte User auf Landing/Pricing.
2. **`AppSidebar.tsx`** — kompaktes Icon im unteren Block, in der Zeile mit „Profile / Logout" als dritte Action. Gut auffindbar, stört Hierarchie nicht.
3. **`Settings.tsx` → Profileinstellungen** — vollwertiger Switch mit Label „Erscheinungsbild" und beschreibendem Mikrotext („Hell wirkt klassisch wie unsere Einladungen, Dunkel betont das Imperiale."). Direkt über dem `MandateBlock`.

Mobile/Auth-Pages bekommen keinen extra Toggle — der Header reicht.

## Phase 5 — Komponenten-Audit (Light-Mode-Verträglichkeit)

Ich gehe durch und prüfe/feinjustiere Stellen, wo `bg-black`, `text-white`, oder hardcoded dunkle Farben statt Tokens benutzt werden — diese müssen auf semantische Tokens umgestellt werden, sonst sind sie im Light Mode kaputt:

- `Logo.tsx` (Wortmarke „PALLANX" — Goldton funktioniert in beiden Modes, aber ggf. Subtitle-Farbe prüfen)
- `Landing.tsx`, `Pricing.tsx` (Hero-Sections, evtl. dunkle Sektionen mit hardcoded HEX)
- `CaseChatView.tsx`, `CaseCard.tsx` (Chat-Bubbles)
- `MandateBlock.tsx`, `EliteRequestModal.tsx`
- `PaymentTestModeBanner.tsx`
- `index.html` Meta-`theme-color`

**Suchstrategie:** `grep` nach `bg-black`, `text-white`, `#` in `.tsx`-Dateien (innerhalb className-Strings) und auf Tokens ummappen (`bg-background`, `text-foreground`, `bg-card`, etc.). Goldton bleibt überall via `--primary`.

## Phase 6 — QA

- Smoke-Test beider Modes auf: Landing, Pricing, Login, Dashboard, Case-Detail, Settings, Billing, Admin.
- Toggle persistiert über Reload (eingeloggt + ausgeloggt).
- Anti-Flash funktioniert (kein weißer Blitz für Dark-User).
- Keine kontrast-kritischen Texte (Gold auf Weiß bleibt ≥ AA).

---

## Files

**Neu**
- `src/contexts/ThemeContext.tsx`
- `src/components/ThemeToggle.tsx`
- `supabase/migrations/<timestamp>_theme_preference.sql`

**Geändert**
- `src/index.css` (Light-Tokens in `:root`, Dark in `.dark`)
- `index.html` (Anti-Flash-Script + theme-color meta)
- `src/App.tsx` (ThemeProvider)
- `src/contexts/AuthContext.tsx` (`theme_preference` in Profile/Select)
- `src/components/PublicHeader.tsx` (Toggle eingebettet)
- `src/components/AppSidebar.tsx` (Toggle eingebettet)
- `src/pages/Settings.tsx` (vollständiger Erscheinungsbild-Block)
- ggf. einzelne Komponenten mit hardcoded Farben (siehe Phase 5)

## Out-of-scope

- Kein „System / Auto"-Modus (nur Light & Dark wie gefordert; Standard = Light).
- Keine Theme-Animationen/Transitions über das hinaus, was Tailwind-Defaults bieten.
- Keine separaten Theme-Varianten für Auth-E-Mails (Mails bleiben wie sind).
