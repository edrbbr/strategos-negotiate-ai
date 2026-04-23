

# Fix: "Pipeline Starten" deaktiviert auf `/app/case/new`

## Was passiert

Du bist auf `/app/case/new`. In `CaseDetail.tsx` bedeutet `routeId === "new"`, dass ein neuer Fall in der DB angelegt werden muss, damit `caseId` existiert. Der Button ist nur dann klickbar wenn `caseId` gesetzt ist:

```ts
disabled={loading || !caseId}
```

Aktuell wird `caseId` **nie gesetzt**, weil die Fall-Erstellung scheitert oder die Navigation nicht durchläuft. Drei Ursachen:

### 1) Race-Condition mit Auth (Hauptursache)
Der `useEffect` in `CaseDetail.tsx` (Zeile 42–50) feuert `createMut.mutate()` sofort beim Mount. `useCreateCase` (`src/hooks/useCases.ts:103`) prüft `if (!user) throw new Error("Not authenticated")`. Wenn `AuthContext` den User noch nicht aus dem Token rehydriert hat, schlägt das Insert fehl mit "Not authenticated". Der `onError`-Handler zeigt einen Toast, aber `routeId` bleibt `"new"` und es gibt **keinen Retry** → `caseId` bleibt undefined → Button bleibt deaktiviert.

### 2) Doppel-Mount in StrictMode
Der Effect hat `[routeId]` als Deps und keinen Schutz gegen doppeltes Feuern. In React StrictMode/Dev-Mode läuft `useEffect` zweimal → es werden zwei leere Cases in der DB angelegt. Der zweite Navigation-Call kann den ersten überschreiben/überholen. Das erklärt auch warum in der Sidebar duplikate Keys-Warnings auftreten (mehrere "Neuer Fall"-Einträge).

### 3) Sidebar-Bug (separat, aber verwandt)
`src/components/AppSidebar.tsx:60` mappt `navItems` mit `key={item.to}`. Zwei Einträge ("Analyse" und "Strategie") zeigen beide auf `/app/dashboard` → React-Warning "two children with the same key". Cosmetic, aber die Console-Warnings die du siehst kommen daher.

## Was wir fixen

### A) `CaseDetail.tsx`: Robuste Case-Erstellung
- Effect erst feuern wenn `user` verfügbar ist (`useAuth().user`).
- Guard gegen Doppel-Feuern via `useRef<boolean>` damit Mutation nur einmal läuft, auch in StrictMode.
- Bei Mutation-Error: User-freundlicher Hinweis + Retry-Button anstatt nur Toast, damit der User nicht in einem kaputten State festsitzt.
- Während die Erstellung läuft, statt eines deaktivierten Pipeline-Buttons einen sichtbaren Loading-State zeigen ("Fall wird angelegt…").

### B) `CaseDetail.tsx`: Button-Tooltip wenn disabled
Wenn der Button disabled ist, dem User sagen warum (Tooltip oder kleiner Text darunter): "Fall wird vorbereitet…" oder "Bitte mindestens 10 Zeichen eingeben". So sieht man auf einen Blick warum nichts passiert.

### C) `AppSidebar.tsx`: Duplicate-Key Bug
Zwei Optionen:
1. `key={item.label}` statt `key={item.to}` (schnellster Fix)
2. "Strategie" auf eine eigene Route ändern (z.B. `/app/strategy`) — aber Route existiert noch nicht, also Variante 1.

Wir nehmen Variante 1.

### D) Aufräumen verwaister leerer Cases (optional, nice-to-have)
Da der Doppel-Mount-Bug evtl. schon mehrere leere Cases erzeugt hat, kannst du dir später ein "Leere Cases löschen"-Cleanup wünschen. Nicht in diesem Fix enthalten.

## Akzeptanzkriterien

- [ ] Beim Aufruf von `/app/case/new` wird genau **ein** Case angelegt und sofort zu `/app/case/<id>` navigiert
- [ ] Wenn die Erstellung scheitert, sieht der User klar "Fall konnte nicht angelegt werden" + Retry-Button — nicht nur einen Toast
- [ ] Der "Pipeline Starten"-Button ist klickbar sobald `caseId` da ist und Situation ≥ 10 Zeichen hat
- [ ] Wenn er deaktiviert ist, steht der Grund unter dem Button
- [ ] Keine "duplicate key" React-Warnings mehr aus `AppSidebar`

## Was NICHT in diesem Schritt ist

- Keine Aufräum-Logik für verwaiste leere Cases in der DB
- Keine Änderung am Pipeline-Code selbst (`strategos-ai-router`)
- Keine Anpassung der Navigation (Strategie bleibt auf Dashboard verlinkt — eigene Route wäre Folge-Prompt)

