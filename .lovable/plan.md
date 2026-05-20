## Ziel
Die Inhalts-Blöcke (Initial-Prompt, Analyse, Strategie, Entwurf, Refinement-Prompts) auf Mobile großzügiger und leserlicher rendern — wie ein angenehmes Lese-Layout (Beispiel: Gemini-Chat im Screenshot). Desktop bleibt unverändert.

## Diagnose
- `src/components/CaseChatView.tsx` rendert pro Version ein 3-Spalten-Grid (`grid lg:grid-cols-3`). Auf Mobile stapelt es zwar, aber:
  - Karten-Padding ist klein (`p-3` innen, `p-5` außen).
  - Textgröße `text-[14px] leading-6` ist auf Smartphones zu kompakt.
  - Labels (`text-[10px]`) und Buttons drängen sich in eine Zeile.
- `src/components/AppLayout.tsx` hat horizontales Padding `px-6` auf Mobile — frisst zusätzlich Platz.

## Änderungen (nur Mobile/Responsive, keine Logik)

### 1. `src/components/AppLayout.tsx`
- Content-Wrapper Padding mobil reduzieren: `px-4 lg:px-10` (statt `px-6 lg:px-10`), damit Lesefläche breiter wird.

### 2. `src/components/CaseChatView.tsx` — `VersionBlock`
- Karten-Padding: `p-4 sm:p-5` (statt `p-5` fix).
- Innere Blöcke (Prompt / Strategie / Entwurf): Padding `p-4 sm:p-3`, Schriftgrößen auf Mobile vergrößern: `text-[16px] sm:text-[14px]`, Zeilenhöhe `leading-7 sm:leading-6`.
- Labels („PROMPT", „STRATEGIE", „ENTWURF") mobil etwas größer: `text-[11px] sm:text-[10px]`, mit mehr Abstand `mb-3 sm:mb-2`.
- Stärkere visuelle Trennung der drei Blöcke auf Mobile: zusätzliche `gap-5 sm:gap-4` und auf Mobile linker Akzent-Border breiter (`border-l-2 sm:border-l`).
- Header-Zeile der Version (Version-Nummer + Action-Buttons): auf Mobile in zwei Reihen umbrechen — bereits `flex-wrap` vorhanden, ergänzen: Action-Buttons in eigene horizontale Scroll-Reihe mit `gap-2 w-full sm:w-auto justify-start sm:justify-end overflow-x-auto`.

### 3. `CaseChatView.tsx` — `InitialBlockInner`
- Padding `p-4 sm:p-5`, Situationstext: `text-[16px] sm:text-[15px] leading-7 sm:leading-7`.
- Meta-Zeile (Sprache · Format) auf Mobile unter den Label-Titel umbrechen lassen (bereits `flex-wrap`), Label-Größe `text-[11px] sm:text-[10px]`.

### 4. `CaseChatView.tsx` — `AnalysisAccordion`
- Inhalt: Listentext von `text-xs` auf `text-[15px] sm:text-xs leading-7 sm:leading-relaxed` heben, Padding `px-5 pb-5 sm:px-4 sm:pb-4`.
- Trigger-Padding `p-5 sm:p-4` für größere Tap-Targets.

### 5. `CaseChatView.tsx` — `change_rationale`-Box
- Padding `p-4 sm:p-3`, Text `text-[15px] sm:text-[13px] leading-7 sm:leading-6`.

### 6. `CaseChatView.tsx` — Refinement-Eingabe & Footer-Bereich
- Eingabe-Textarea Mobile etwas höher: `min-h-[110px] sm:min-h-[80px]` und Schrift `text-[16px] sm:text-[15px]` (vermeidet iOS-Zoom-In bei Focus).
- SuggestionChips: Tap-Targets `py-2 sm:py-1.5 text-[12px] sm:text-[11px]`.

### 7. CaseChatView Container-Höhe
- `h-[calc(100vh-180px)]` auf Mobile zu knapp wegen Mobile-Header (≈ 56 px) + zusätzlichem Padding. Auf Mobile auf `h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)]` setzen, damit die Lesefläche mehr Raum bekommt.

## Out of Scope
- Keine Backend-/Daten-Änderungen.
- Keine Änderung an der Desktop-Darstellung (3-Spalten-Grid bleibt ab `lg`).
- Markdown-Rendering der KI-Antworten ist nicht Teil dieser Anfrage (Texte bleiben Plain mit `whitespace-pre-line`).

## Technisches Detail
- Reine Tailwind-Responsive-Class-Anpassungen (`sm:`-Prefix). Bestehende Layout-Struktur und Komponenten-Logik bleiben unverändert.
