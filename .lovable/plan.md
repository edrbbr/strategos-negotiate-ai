## Änderungen in `src/components/CaseChatView.tsx`

### 1. Lesefläche: kein eigener Rahmen, aber auf Bildschirmhöhe begrenzt
- Wrapper bleibt mit Höhenbegrenzung, damit die Seite nicht über die Viewport-Höhe wächst:
  - Mobile: `h-[calc(100dvh-120px)]` (dvh = dynamische Viewport-Höhe, korrekt auf iOS).
  - Desktop: `sm:h-[calc(100vh-180px)] sm:min-h-[600px]`.
- Den visuellen „Rahmen" entfernen: Die Timeline scrollt weiterhin intern (`overflow-y-auto`), aber wirkt nahtlos:
  - Padding rechts entfernen (`pr-2` raus), `space-y-6 pb-6`.
  - Keine Border am Footer auf Mobile: `border-t border-border/30 sm:border-t` durch `sm:border-t border-t-0` ersetzen, sodass mobil keine sichtbare Trennlinie/Frame entsteht.
- Ergebnis: Inhalt füllt die volle Breite/Höhe der Seite, fühlt sich wie Seiten-Scroll an, ohne dass das App-Layout selbst länger wird.

### 2. Refinement-Vorschläge auf Mobile ausblenden
- `SuggestionChips`-Wrapper: `flex flex-wrap` → `hidden sm:flex flex-wrap`.

### 3. Enter-zu-Senden entfernen + Senden-Icon in der Textbox
- `onKeyDown` im Textarea entfernen (Enter erzeugt nur Zeilenumbruch).
- Senden-Button in den Eingabe-Container verschieben:
  - Container `relative` (bereits da). Button absolut unten rechts: `absolute bottom-2 right-2`.
  - Reines Icon: `<Send className="w-4 h-4" />` bzw. `<Loader2 …>` während pending. Kein Text.
  - Tap-Target ~36 px (`h-9 w-9 rounded-sm`), Variante `gold`, `aria-label="Senden"`, `title="Senden"`.
  - Textarea bekommt `pr-12` damit Text nicht unter dem Icon verschwindet.
- Den separaten `<div className="flex justify-end mt-3">…Senden…</div>` darunter komplett entfernen.
- Placeholder anpassen: „Anweisung zur Anpassung eingeben…" (ohne Enter-Hinweis).

### Out of Scope
- Keine Logik-/Backend-Änderungen.
- Desktop-Layout (Sticky-Input + Scroll-Timeline) bleibt funktional gleich; nur das Mobile-Look ändert sich + Button wird auch auf Desktop zum Icon-Button in der Box.
- Expand/Maximize-Dialog bleibt unverändert (dort weiterhin Text-Senden-Button).
