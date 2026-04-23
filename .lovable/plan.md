

# Test-User mit Elite-Status anlegen

## Ziel
Einen Test-Account `test-tregos-str@mail.com` mit Passwort `strategos23042026!` erstellen, sofort einsatzbereit (E-Mail-bestätigt) und mit aktivem **Elite**-Plan im Profil.

## Vorgehen

### 1. User in `auth.users` anlegen
Über eine kurze Edge-Function (einmaliger Aufruf, danach Löschung) mit Service-Role-Key:
```ts
await supabaseAdmin.auth.admin.createUser({
  email: "test-tregos-str@mail.com",
  password: "strategos23042026!",
  email_confirm: true,           // sofort verifiziert, kein Bestätigungs-Mail-Klick nötig
  user_metadata: { full_name: "Strategos Testuser" },
});
```
Der bestehende `handle_new_user`-Trigger erstellt automatisch den Profile-Eintrag mit `plan_id = 'free'`.

### 2. Profil auf Elite hochstufen
Direkt danach via SQL (Migration mit `UPDATE` auf `profiles`, da die RLS-Policy User-seitige Plan-Änderungen blockiert — Service-Role umgeht das):
```sql
UPDATE public.profiles
SET plan_id = 'elite',
    billing_cycle = 'yearly',
    subscription_status = 'active',
    cases_used = 0,
    updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'test-tregos-str@mail.com');
```

### 3. Aufräumen
Die temporäre Edge-Function nach erfolgreicher Ausführung wieder löschen, damit kein offener Endpoint zur User-Erstellung im Projekt verbleibt.

## Ergebnis
- Login möglich mit `test-tregos-str@mail.com` / `strategos23042026!`
- Plan: **Elite**, Status `active`, Abrechnung `yearly`
- Keine Stripe-Subscription verknüpft (rein manueller Test-Account) — bei späterem Upgrade über Stripe-Portal würde der Webhook `subscriptions` befüllen und das Profil über den vorhandenen `sync_profile_from_subscription`-Trigger neu schreiben.

## Sicherheitshinweis
Bitte das Passwort nach den Tests rotieren oder den Account löschen. Da es im Klartext in der Konversation steht, ist es nicht mehr vertraulich.

## Dateien
| Datei | Änderung |
|---|---|
| `supabase/functions/_temp-create-testuser/index.ts` | neue Einmal-Function, ruft `admin.createUser` |
| Migration | `UPDATE profiles` für Elite-Hochstufung |
| `supabase/functions/_temp-create-testuser/` | nach Ausführung wieder gelöscht |

