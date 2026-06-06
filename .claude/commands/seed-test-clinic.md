---
description: Provision a fully-populated demo clinic in one shot (founder + 2 doctors + 5 patients + sample appointments + trialing Practice subscription)
allowed-tools: Bash
---

# /seed-test-clinic

End-to-end clinic provisioning for demos and local testing. Creates the
clinic, founder auth user, clinic_admin link, 2 departments, 2 doctors with
weekly availability, 3 services, 5 demo patients, 3 sample appointments for
today, and a trialing Practice subscription.

If the founder email already exists in `auth.users`, the script reuses it.
If the slug is taken, the script refuses (run `/delete-test-clinic` first
when that's built, or pick a different slug).

## Usage

`/seed-test-clinic <slug> <clinic-name> <founder-email>`

Slug must be kebab-case (lowercase letters, digits, dashes).
Clinic name can contain spaces — quote it: `/seed-test-clinic acme "Acme Wellness" founder@example.com`

## What to do

1. Parse `$ARGUMENTS`. If `clinic-name` was quoted, preserve the quotes when forwarding.
2. Run:

```bash
npx tsx --env-file=.env.local scripts/seed-test-clinic.ts <slug> "<name>" <email>
```

3. Surface stdout verbatim. The output ends with the URLs to visit and (for
   new founders) the temp password — call those out to the user explicitly.

$ARGUMENTS
