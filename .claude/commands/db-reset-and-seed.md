---
description: Wipe local Supabase, replay all migrations, reseed, regen TypeScript types
allowed-tools: Bash
---

# /db-reset-and-seed

The standard "I just changed the schema" sequence. Runs:

1. `supabase db reset` — wipes local Supabase + replays every migration
2. `supabase db push` — applies any new migration on disk that the reset
   missed (rare; covers race with file system writes)
3. Runs `supabase/seed.sql` if it exists (the reset usually does this; this
   re-runs to be safe)
4. Regenerates `src/lib/supabase/database.types.ts` so the TS compiler sees
   the new shape

## Usage

`/db-reset-and-seed`

## What to do

1. Confirm with the user that they really want to wipe local data —
   `supabase db reset` is destructive. If they say no, stop.
2. Run, surfacing each step's stdout:

```bash
npm run db:reset
```

3. Then:

```bash
npm run db:types
```

4. Run `npm run typecheck` to verify the regenerated types still compile.
5. If anything errored, surface the message and suggest the next step.

$ARGUMENTS
