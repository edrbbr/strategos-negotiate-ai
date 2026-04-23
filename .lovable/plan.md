

# Refinement liefert fast identischen Text — Fix

## Problem
Beim Klick auf "Senden" entsteht zwar eine V2-Version, aber der Entwurf ist visuell zu 95% identisch mit V1. Beleg aus der DB: V1 = 2436 Zeichen, V2 = ein zusätzlicher Absatz, sonst Wort-für-Wort kopiert.

Drei Ursachen:

1. **Modell zu schwach für Rewriting**: `google/gemini-2.5-flash-lite` neigt dazu, den Originaltext zu kopieren und nur Mini-Patches einzufügen, statt wirklich umzuschreiben.
2. **System-Prompt sabotiert die Anweisung**: aktuell steht dort *"Keep the strategic intent intact, only modify tone, length, or emphasis as instructed"* — das sagt dem Modell explizit „ändere möglichst wenig".
3. **User-Prompt ist nicht prominent genug**: Die Instruktion steht am Ende eines langen Kontextes und hat im aktuellen Prompt-Aufbau weniger Gewicht als der mitgeschickte Originaltext.

## Lösung

### 1. Modell upgraden
In `supabase/functions/strategos-refinement/index.ts`:
- `google/gemini-2.5-flash-lite` → `google/gemini-2.5-flash`
  - immer noch sehr günstig, aber deutlich besser bei „echtem" Rewriting
  - flash-lite bleibt nur in der Suggestion-Function (dort macht es Sinn)

### 2. System-Prompt komplett neu
Der neue Prompt macht klar: **vollständig neu schreiben**, nicht patchen.

```
You are STRATEGOS in REFINEMENT mode.
You receive an existing negotiation draft and a user instruction.
Your job: produce a COMPLETE, FULLY REWRITTEN draft that clearly
reflects the user instruction. Do NOT copy the previous draft
sentence by sentence. Restructure freely. Change wording, order,
and emphasis as needed so the change is unmistakable to a reader
who compares both versions.

Hard rules:
- Keep the underlying strategic goal and key facts (numbers, names, deadlines).
- Reply ONLY in the requested language.
- Match the requested medium (email/WhatsApp/SMS/letter) — length and tone.
- Output ONLY the rewritten draft text. No preamble, no labels, no explanation, no markdown fences.
```

### 3. User-Message umstrukturieren
Reihenfolge so ändern, dass die Instruktion zuerst und am stärksten gewichtet wird:

```
INSTRUCTION (highest priority):
{instruction}

LANGUAGE: {language_label}
MEDIUM: {medium}

ORIGINAL SITUATION:
{situation_text}

PREVIOUS DRAFT (rewrite this completely according to the instruction above):
{currentDraft}

Now return the fully rewritten draft in {language_label}.
Do not start with the same opening as the previous draft unless the instruction explicitly asks for it.
```

### 4. Temperature setzen
Im Gateway-Call `temperature: 0.7` ergänzen, damit das Modell nicht in den deterministischen "Copy-Modus" verfällt (Default ist je nach Modell zu konservativ für Rewriting).

### 5. Sanity-Check serverseitig
Wenn der zurückgegebene Draft zu >85% Token-Overlap mit dem alten hat, einmal erneut anfragen mit verschärfter Instruktion (`"The previous attempt was too similar to the old draft. Rewrite more boldly: change structure, opening, and wording."`). Maximal 1 Retry — keine Endlosschleife, keine Kostenexplosion.

## Akzeptanzkriterien
- V2 unterscheidet sich klar erkennbar von V1 (anderer Einstieg, andere Satzstruktur)
- Strategie-Intention und Fakten (Zahlen, Namen, Fristen) bleiben erhalten
- Sprache bleibt = `language_label`
- Maximal 1 zusätzlicher AI-Call pro Refinement (nur wenn Output zu ähnlich)
- Kosten weiterhin niedrig (flash statt flash-lite ≈ 3–4× Preis, immer noch Cent-Bereich)

## Was unverändert bleibt
- Sniper-Logik: Analyse, Strategie, Strategy-Labels werden weiterhin aus der Vorgängerversion kopiert (kein Extra-AI-Call dafür)
- Datenmodell, UI, Restore, Realtime, Quick-Suggestions

## Nicht enthalten
- Diff-Highlighting alt vs. neu (separate Aufgabe)
- Wechselbare Modelle pro User

