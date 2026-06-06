---
description: Diagnose "why can/can't this user sign in?" — auth row + clinic links + superadmin flag + landing page
allowed-tools: Bash
---

# /whoami

Looks up an auth user by email and prints everything that affects their
sign-in experience: confirmation state, last sign-in, superadmin flag,
clinic_users links, patient_users links, and where they'll land post-login.

Run this first when someone complains "login isn't working".

## Usage

`/whoami <email>`

## What to do

```bash
npx tsx --env-file=.env.local scripts/whoami.ts <email>
```

Surface stdout. If you spot something off (no clinic link → blank admin pages;
unconfirmed email → won't be allowed to sign in; superadmin flag missing →
`/superadmin/*` will redirect to login), call it out in the response so the
user can act.

$ARGUMENTS
