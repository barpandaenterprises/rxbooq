---
description: Flip a clinic's verification_status to 'verified' immediately (skip the review queue)
allowed-tools: Bash
---

# /verify-clinic

Sets `clinics.verification_status = 'verified'` and stamps `verified_at` so
the clinic's public profile shows the green Verified badge right away. Use
for sales demos / partner clinics where you don't want to wait on the manual
review at `/superadmin/verifications`.

## Usage

`/verify-clinic <clinic-slug>`

## What to do

```bash
npx tsx --env-file=.env.local scripts/verify-clinic.ts <slug>
```

Surface stdout.

$ARGUMENTS
