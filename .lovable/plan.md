## Ziel

In beiden Retail-KI-Funktionen den System-Prompt so nachschärfen, dass die KI sich primär auf **robuste, unstrittige Rechtshebel** stützt und **streitbare Einzelfall-Einstufungen nicht als "eindeutig" formuliert**. Keine Schema- oder UI-Änderung.

## Änderungen

### 1. `supabase/functions/retail-shield-pipeline/index.ts`

Im System-Prompt einen neuen Block ergänzen (nach "RECHTLICHE HEBEL"):

```
HEBEL-PRIORISIERUNG (zwingend):
- Stütze deine Argumentation gegenüber dem Kunden PRIMÄR auf die robustesten, unstrittigen Hebel — insbesondere den Nacherfüllungsvorrang (§ 439 BGB) und die Voraussetzung einer fehlgeschlagenen Nacherfüllung vor Rücktritt/Minderung (§ 440 BGB). Solange Nachbesserung möglich und nicht versucht wurde, ist Rücktritt regelmäßig ausgeschlossen — das trägt den Fall meist allein.
- Streitbare, einzelfallabhängige Einstufungen (z. B. ob ein sichtbarer Mangel an hochwertiger Neuware "unerheblich" i.S.d. § 323 Abs. 5 BGB ist, Schwellen der Unverhältnismäßigkeit nach § 439 IV, Auslegung von § 442 bei grenzwertiger Kenntnis) NIEMALS als "eindeutig", "klar" oder "zweifellos" darstellen.
- Wenn ein robusterer Hebel den Fall ohnehin trägt: streitbare Punkte WEGLASSEN.
- Wenn ein streitbarer Punkt erwähnt werden muss: ausdrücklich als "im Einzelfall strittig / gerichtlich nicht einheitlich beurteilt" kennzeichnen, sowohl in `legal_position` als auch in `legal_levers` der gewählten Option.
- Begründung: Eine forsche, angreifbare Rechtsbehauptung schwächt die Verhandlungsposition und gefährdet den Händler im Streitfall. Das widerspricht dem Schutzziel.
```

Zusätzlich im selben Prompt klarstellen: `customer_wording` und `email_draft` dürfen streitbare Punkte nur in der vorsichtigen Form ("kann im Einzelfall anders bewertet werden") anführen — bevorzugt aber den robusten Nacherfüllungs-Hebel als Hauptargument.

### 2. `supabase/functions/b2b-case-refine/index.ts`

Denselben "HEBEL-PRIORISIERUNG"-Block ins System-Prompt einfügen (an äquivalenter Stelle nach den rechtlichen Hebeln). Zusätzlich ein Hinweis für die Refinement-Logik:

```
- Wenn in einer Vorrunde ein streitbarer Hebel zu absolut formuliert wurde, korrigiere ihn in der nächsten Runde stillschweigend, ohne die eigene Glaubwürdigkeit zu untergraben — verschiebe das Argument auf den robusten Nacherfüllungsvorrang.
```

### 3. Deployment

Beide Funktionen deployen: `retail-shield-pipeline`, `b2b-case-refine`.

### 4. Validierung (manuell durch den Nutzer)

Sofa-Fall erneut analysieren und prüfen:
- `legal_position` / `legal_levers` führen § 439 / § 440 als Hauptargument.
- Aussagen wie "Mangel ist eindeutig unerheblich nach § 323 V" tauchen NICHT mehr auf — entweder weggelassen oder als "im Einzelfall strittig" gekennzeichnet.
- `customer_wording` bleibt höflich und stützt sich auf den Nacherfüllungsvorrang.

## Nicht Teil dieser Änderung

- Keine Schema-Änderungen (Felder bleiben wie nach der vorherigen Runde).
- Keine UI-Anpassungen.
- Keine Migration.
