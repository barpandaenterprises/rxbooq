---
description: Reset an auth user's password via the Supabase admin API (generates a strong one if not provided)
allowed-tools: Bash
---

# /reset-password

Resets a user's password. Goes through `supabase.auth.admin.updateUserById`
(not raw SQL on `auth.users.encrypted_password`) so it routes through the
same code path Supabase Dashboard uses — respects any password policy and
keeps the audit trail clean.

If no password is supplied, a strong 14-character one is generated and
printed. It's only visible once; share it out of band.

## Usage

`/reset-password <email>` — generate a new strong password
`/reset-password <email> <new-password>` — set a specific one

## What to do

1. Parse `$ARGUMENTS` — first token is the email, anything after is the
   optional explicit password (preserve as-is, including whitespace inside
   if the user quoted it).
2. Run:

```bash
npx tsx --env-file=.env.local scripts/reset-password.ts <email> [new-password]
```

3. Surface stdout verbatim. The new password is in the output — call it
   out clearly to the user.

4. Existing sessions/refresh-tokens may stay valid for up to ~1 hour. If
   the user needs immediate forced sign-out (e.g. compromised account),
   tell them they'd also need to delete from `auth.sessions` +
   `auth.refresh_tokens` for that user — a future `/sign-out-user` command
   will package that up.

$ARGUMENTS
