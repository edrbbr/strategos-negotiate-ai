# Admin-Schalter: Global Claude ⇄ Kimi für alle Pipelines

Ein versteckter, nur für Admins sichtbarer Schalter, der den primären KI-Provider für **alle** Pallanx-Pipelines (B2C + B2B/Retail) global umschaltet. Kimi-Modell: `kimi-k2-0905-preview`. Vision (Anhänge-Extraktion) ist separat schaltbar.

## Verhalten

- Default = Claude (heute) — nichts ändert sich beim Roll-out
- Schalter umlegen → alle nachfolgenden Pipeline-Runs nutzen Kimi
- Fehler/Timeout-Fallback auf Lovable Gemini bleibt erhalten
- Schalter und Test-Buttons sind nur für `has_role(uid,'admin')` sichtbar

## Betroffene Pipelines (alle umschaltbar)

| Pipeline | Datei | Stages |
|---|---|---|
| B2C Single-Call (Free) | `strategos-ai-router/pipelines/singleCall.ts` | Chat |
| B2C Multi-Stage (Pro/Elite) | `strategos-ai-router/pipelines/multiStage.ts` | Analysis, Strategy, Draft |
| B2C Refinement | `strategos-refinement/index.ts` | Chat + Tool |
| B2C Suggest Refinements | `strategos-suggest-refinements/index.ts` | Tool |
| B2C Upgrade Preview | `strategos-upgrade-preview/index.ts` | Tool |
| B2B Case Refine | `b2b-case-refine/index.ts` | Tool + Text |
| Retail Shield Pipeline | `retail-shield-pipeline/index.ts` | Tool + Text |
| Vision-Extract (Anhänge) | `_shared/anthropic.ts → callAnthropicVisionExtract` | separater Schalter |

## Technische Umsetzung

### 1. DB — Single-Row Settings-Tabelle
```sql
CREATE TABLE public.ai_provider_settings (
  id text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
  chat_provider text NOT NULL DEFAULT 'anthropic',   -- 'anthropic' | 'kimi'
  chat_model    text NOT NULL DEFAULT 'claude-sonnet-4-5',
  vision_provider text NOT NULL DEFAULT 'anthropic', -- 'anthropic' | 'kimi'
  vision_model    text NOT NULL DEFAULT 'claude-sonnet-4-5',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.ai_provider_settings TO authenticated;
GRANT ALL    ON public.ai_provider_settings TO service_role;
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;
-- Lesen: authenticated (Router & Frontend brauchen den Status für Banner)
CREATE POLICY ai_provider_read ON public.ai_provider_settings FOR SELECT TO authenticated USING (true);
-- Schreiben: nur Admin
CREATE POLICY ai_provider_write ON public.ai_provider_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
-- Seed
INSERT INTO public.ai_provider_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;
```

### 2. Neuer Kimi-Adapter (OpenAI-kompatibel)
- `supabase/functions/_shared/kimi.ts` — `callKimiTool`, `callKimiText`, `callKimiVisionExtract`
- Endpoint `https://api.moonshot.ai/v1/chat/completions`, Header `Authorization: Bearer $KIMI_API_KEY`
- Identische Signaturen wie die Anthropic-Pendants → Drop-in-Tausch
- Pipeline-Variante in `strategos-ai-router/providers/kimi.ts` mit derselben `callAnthropic`-kompatiblen Signatur

### 3. Provider-Resolver
Neue Datei `supabase/functions/_shared/aiProvider.ts`:
```ts
export async function resolveAiProvider(supabase, kind: 'chat' | 'vision') {
  const { data } = await supabase.from('ai_provider_settings').select('*').eq('id','global').single();
  // → { provider, model, callTool, callText, callVision }
}
```
Wrappt Anthropic- oder Kimi-Adapter. Jede Edge Function holt sich vor dem Call den Resolver — eine Query pro Request, minimal.

### 4. Anpassung jeder Pipeline
Alle oben gelisteten Funktionen ersetzen direkte `callAnthropic*`-Aufrufe durch den Resolver. Tool-Schemas, Prompts, Token-Limits bleiben **unverändert**. Fallback-Pfade (Gemini) bleiben.

### 5. Admin-UI
Neue Page `src/pages/admin/AdminAIProvider.tsx`, im Admin-Sidebar:
- 2 Cards: "Chat-Provider", "Vision/Anhänge-Provider"
- Pro Card: `Select` (Anthropic Claude / Moonshot Kimi) + Modell-Input (Default `claude-sonnet-4-5` bzw. `kimi-k2-0905-preview`)
- "Speichern"-Button (Update via Supabase Client; RLS schützt)
- "Test"-Button → ruft neue Edge Function `ai-provider-ping` mit ausgewählter Konfig auf, zeigt Latenz + ersten 200 Zeichen Output

### 6. Edge Function `ai-provider-ping`
- Admin-only (JWT + `has_role`-Check serverseitig)
- Body: `{ kind: 'chat' | 'vision', provider, model }`
- Macht einen kurzen Hello-Call und gibt `{ ok, latency_ms, sample }` zurück

### 7. Admin-Sicht-Test-Buttons im B2C & B2B
- In `CaseChatView.tsx` (B2C) und `src/components/retail/case/ViewChat.tsx` (B2B/Retail) ein kleiner Badge "AI: Kimi · Test" nur sichtbar wenn `useUserRole().isAdmin` true
- Klick → ruft `ai-provider-ping` mit aktueller Konfig, zeigt Toast mit Ergebnis
- Für normale Nutzer unsichtbar

## Aufwand & Risiko

- Aufwand: ~2 Std Implementation
- Risiko Qualität: Kimi liefert spürbar andere Tonalität als Claude (besonders in Deutsch-Verhandlung). Banner in Admin-UI weist darauf hin.
- Rollback: Schalter zurück auf "anthropic" → sofort wieder Claude.

## Offene Punkte (bitte bestätigen)

1. Soll der Banner "AI: Kimi" für Admins **immer** sichtbar sein oder nur wenn Provider ≠ Default Claude?
2. Soll die Schreib-Aktion in `analytics_events` geloggt werden (für Audit, wer hat wann umgeschaltet)?
