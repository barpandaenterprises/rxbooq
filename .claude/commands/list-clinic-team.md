---
description: Print every clinic_users row for a clinic (role, name, email, phone, joined)
allowed-tools: Bash
---

# /list-clinic-team

Shows the full team for a clinic — who can sign in to `/admin/*` for that
tenant. Useful before granting / revoking access.

## Usage

`/list-clinic-team <clinic-slug>`

## What to do

```bash
npx tsx --env-file=.env.local scripts/list-clinic-team.ts <slug>
```

Surface stdout verbatim (it's already formatted as a table).

$ARGUMENTS
