# Doctor Kart — Setup Guide

Step-by-step from clone to running locally with the Mahakur tenant rendered.

---

## 1. Install dependencies

```bash
cd doctorkart
npm install
```

This pulls Next.js 16, React 19, Tailwind, shadcn dependencies, Supabase SSR, TanStack Table, AG Grid, Recharts, next-intl, and the rest of the dev tooling. Storybook is added later via `npx storybook@latest init` once the first component exists — that command auto-detects Next 16 and pulls compatible versions.

## 2. Fonts — already handled

Poppins is loaded via `next/font/google` (`src/app/fonts.ts`). Next.js downloads the woff2 files at **build time** and serves them from your own server — no runtime request to Google, still DPDP-clean. There's nothing for you to do here.

If you ever need to fully air-gap (zero build-time external calls too), switch `fonts.ts` back to `next/font/local` and drop the five Poppins woff2 files into `src/app/fonts/`. Not needed for v1.

## 3. Bootstrap shadcn/ui

The base config (`components.json`) is already in place. Pull in the primitives we'll use across the app:

```bash
npx shadcn-ui@latest add button input label select dialog sheet tabs badge avatar tooltip card dropdown-menu command popover form
```

Each command writes a file to `src/components/ui/`. Don't edit those by hand — re-running `add` would overwrite changes.

## 4. Set up Supabase

### Option A — Cloud project (recommended for shared dev)

1. Create a project at https://supabase.com.
2. Region: **Mumbai** (DPDP friendly).
3. From Project Settings → API copy `Project URL`, `anon` key, and `service_role` key into `.env.local`.

```bash
cp .env.local.example .env.local
# then fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

4. Link the CLI and apply migrations + seed:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                     # applies supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seed.sql   # or use the SQL editor in Supabase Studio
```

### Option B — Local Supabase via the CLI

```bash
supabase start                       # boots Postgres + Auth + Storage in Docker
supabase db reset                    # applies migrations + seed
```

The CLI prints local `anon` and `service_role` keys; copy them into `.env.local`.

## 5. Generate types

After the schema is applied:

```bash
npm run db:types
```

This regenerates `src/lib/supabase/database.types.ts` from your live schema. Re-run it any time you change a migration.

## 6. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000?clinic=mahakur — the placeholder home page should report `Tenant resolved: mahakur`. Try `?clinic=democlinic` to confirm the second seeded tenant works.

When you're ready to test on real subdomains, add this to your `hosts` file:

```
127.0.0.1   mahakur.doctorkart.local
127.0.0.1   democlinic.doctorkart.local
```

then visit http://mahakur.doctorkart.local:3000.

## 7. Storybook (add when ready)

Storybook isn't installed by default — it would block `npm install` due to a peer-dep mismatch with Next 16. When you have your first component to preview, run:

```bash
npx storybook@latest init
```

That command auto-detects Next 16 + React 19 and installs the right Storybook version with addons. The `.storybook/` folder I scaffolded (with mobile / tablet / laptop / desktop viewports and the four background tokens) will be preserved.

## 8. Recommended editor extensions

- ESLint
- Prettier — Code formatter
- Tailwind CSS IntelliSense
- vscode-styled-components
- Supabase

## 9. CI (when you push to GitHub)

A bare-bones GitHub Actions workflow is **not** included in this scaffold; add one in week 1 with these jobs:

- Lint + typecheck (`npm run lint`, `npm run typecheck`).
- Build (`npm run build`).
- Storybook build (`npm run build-storybook`) → upload to Chromatic for visual regression.
- Tenant isolation suite once it exists.

## 10. Move the Claude Code commands

```bash
mkdir -p .claude/commands
mv claude-commands/*.md .claude/commands/
rmdir claude-commands
```

You can now run `/screen-impl 02-booking-step1`, `/new-primitive StatusBadge`, `/wire-page (clinic-app)/admin/today/page.tsx`, etc.

---

## Common errors

**`Font file not found: Can't resolve './fonts/Poppins-Regular.woff2'`** — your `fonts.ts` is still using `next/font/local`. The current version uses `next/font/google` (which auto-downloads at build time). Either restore `fonts.ts` to use `next/font/google` or drop the Poppins woff2 files into `src/app/fonts/`.

**`SUPABASE_SERVICE_ROLE_KEY is not set`** — `.env.local` is missing or wasn't loaded; restart the dev server after editing it.

**`relation "public.clinics" does not exist`** — migrations weren't applied. Run `supabase db push` (cloud) or `supabase db reset` (local).

**Tailwind utilities like `bg-cta` not recognized** — check that `src/styles/globals.css` is imported in `src/app/layout.tsx` and that `tailwind.config.ts`'s `content` glob matches `src/**/*.{ts,tsx}`.
