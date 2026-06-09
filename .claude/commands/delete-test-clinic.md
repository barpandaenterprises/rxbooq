---
description: Delete a clinic and ALL its related data (doctors, patients, appointments, team, subscription) plus orphaned auth users. Dry-run by default.
allowed-tools: Bash
---

# /delete-test-clinic

Tear down a throwaway clinic and everything attached to it — the inverse of
`/seed-test-clinic`. Deleting the `clinics` row cascades to every clinic-scoped
table (doctors, patients, appointments, services, departments, availability,
visit notes, prescriptions, wa_messages, subscriptions, …). The script also
clears the blocking `clinic_applications` rows and removes auth users (founder +
doctor/patient logins) that were attached **only** to this clinic, so the slug
and founder email are free to reseed.

Kept on purpose: `audit_logs` (clinic_id nulled, trail survives), auth users
still linked to another clinic, and platform superadmins.

This is destructive and hard to reverse — so the script is a **dry run unless
`--yes` is passed**.

## Usage

`/delete-test-clinic <slug>`

## What to do

1. Parse `$ARGUMENTS` for the slug.
2. **First run the dry run** (no `--yes`) to show exactly what will be deleted:

```bash
npx tsx --env-file=.env.local scripts/delete-test-clinic.ts <slug>
```

3. Surface that preview to the user verbatim and ask them to confirm.
4. Only after the user confirms, run with `--yes`:

```bash
npx tsx --env-file=.env.local scripts/delete-test-clinic.ts <slug> --yes
```

   Add `--keep-users` if the user wants to preserve the auth accounts (founder /
   logins) and only drop the clinic data.

5. Surface stdout verbatim.

$ARGUMENTS
