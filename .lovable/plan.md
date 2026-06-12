## Ziel
In `/admin/knowledge` jedes Buch mit hochgeladener PDF um einen **Herunterladen**-Button erweitern.

## Umsetzung
- In `src/pages/AdminKnowledge.tsx` in der Button-Reihe jeder Buch-Karte (neben „PDF ersetzen / Neu indexieren / Löschen") einen Button `Herunterladen` einfügen.
- Sichtbar nur wenn `b.file_path` gesetzt ist.
- Onclick erzeugt eine signierte URL (Bucket `knowledge-base` ist privat) via `supabase.storage.from("knowledge-base").createSignedUrl(b.file_path, 60, { download: \`\${b.book_key}.pdf\` })` und öffnet sie in einem neuen Tab (bzw. triggert Download via temporärem `<a download>`).
- Fehlerbehandlung via `toast.error`.

## Hinweise
- Keine Backend-/Migrationsänderungen nötig – RLS/Storage-Policies erlauben Admins bereits Lesezugriff auf `knowledge-base`.
- Kein neuer State; reine UI-Erweiterung.
