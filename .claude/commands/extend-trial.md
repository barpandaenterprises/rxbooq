---
description: Push trial_ends_at out by N days on a clinic's in-flight subscription
allowed-tools: Bash
---

# /extend-trial

Adds N days to a clinic's existing `trial_ends_at`. Only operates on
subscriptions in `trialing` status — refuses if the subscription is already
`active` (paid) or `cancelled`, since extending those is rarely what you
want (and is recoverable via the superadmin UI).

## Usage

`/extend-trial <clinic-slug> <days>`

Days: positive integer ≤ 365.

## What to do

```bash
npx tsx --env-file=.env.local scripts/extend-trial.ts <slug> <days>
```

Surface stdout. The output includes the old and new `trial_ends_at` for the
audit trail.

$ARGUMENTS
