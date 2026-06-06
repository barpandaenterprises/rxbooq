---
description: Trigger the daily expire-trials cron immediately (instead of waiting until midnight)
allowed-tools: Bash
---

# /expire-trials-now

Hits the `/api/cron/expire-trials` endpoint with the `CRON_SECRET` from
`.env.local`. Any subscription with `status='trialing'` and `trial_ends_at <
now()` is downgraded to Free in the same way the scheduled cron would.

Useful for testing the post-trial downgrade behaviour without time-travel.

## Usage

`/expire-trials-now`

## What to do

1. Read `CRON_SECRET` from `.env.local`. If missing, tell the user to add one
   (32+ random chars) and stop.
2. Resolve the dev server URL — default `http://localhost:3000`. If `PORT`
   is set in the env, honour it.
3. Curl the endpoint:

```bash
curl -fsS -H "Authorization: Bearer $(grep ^CRON_SECRET .env.local | cut -d= -f2-)" \
  http://localhost:3000/api/cron/expire-trials
```

4. Pretty-print the JSON response. The interesting field is `downgraded` —
   the number of subscriptions flipped to Free this run.

5. If the dev server isn't running, the curl will fail — tell the user to
   start `npm run dev` first.

$ARGUMENTS
