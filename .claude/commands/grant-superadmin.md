---
description: Promote an auth user to platform superadmin (sets raw_app_meta_data.role='superadmin')
allowed-tools: Bash
---

# /grant-superadmin

Flips `raw_app_meta_data.role = 'superadmin'` on an auth user so they can
access `/superadmin/*`. Goes via the Supabase admin API (not raw SQL) so the
JWT refresh path picks up the new claim correctly.

## Usage

`/grant-superadmin <email>`

## What to do

1. Run:

```bash
npx tsx --env-file=.env.local scripts/grant-superadmin.ts <email>
```

2. Surface stdout. The user must **sign out + sign in again** before the
   superadmin claim is in their session — remind them of this.

$ARGUMENTS
