---
description: Link an existing auth user to a clinic with a role (clinic_admin / doctor / receptionist)
allowed-tools: Bash
---

# /add-clinic-user

Adds a `clinic_users` row tying an auth user (by email) to a clinic (by slug)
with a specific role. Idempotent — if the user is already in that clinic the
command reports the existing role and exits clean.

## Usage

`/add-clinic-user <email> <clinic-slug> <role>`

Roles: `clinic_admin` · `doctor` · `receptionist`.

## What to do

1. Parse `$ARGUMENTS` — expect three whitespace-separated values: email, slug, role.
2. If any are missing, print the usage line above and stop.
3. Run:

```bash
npx tsx --env-file=.env.local scripts/add-clinic-user.ts <email> <slug> <role>
```

4. Surface stdout verbatim. Common failures:
   - "No auth user with email …" → the user needs to sign up at `/login` first, or you create them via Supabase dashboard.
   - "already linked to a different clinic" → use `/transfer-clinic-admin` (not yet built).

$ARGUMENTS
