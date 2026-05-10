# Doctor Kart

Multi-tenant clinic platform: website, online booking, WhatsApp automation. Built with Next.js 16 (App Router) + React 19 + Supabase.

> Pilot tenant: Mahakur Poly Dental Clinic (Sambalpur). Designed to scale to 100+ clinics on the same codebase.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your keys
cp .env.local.example .env.local

# 3. Initialize shadcn/ui (one-time, will create src/components/ui/*)
npx shadcn-ui@latest init -d

# 4. Add the base shadcn components we need
npx shadcn-ui@latest add button input label select dialog sheet tabs badge avatar tooltip card dropdown-menu command popover form

# 5. Run dev server
npm run dev
```

Open http://localhost:3000 — you'll see the Mahakur tenant home placeholder until we wire data.

---

## Required local tools

| Tool | Version | Why |
|------|---------|-----|
| Node.js | ≥ 20.x | Next.js 14 |
| npm | ≥ 10.x | Bundled with Node |
| Supabase CLI | latest | Migrations, local dev DB |
| Vercel CLI (optional) | latest | Preview deploys |

```bash
# macOS / Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

---

## Day-1 setup checklist

- [ ] `npm install` runs clean
- [ ] `.env.local` filled with Supabase + Interakt keys (see `.env.local.example`)
- [ ] `supabase login` and link your project: `supabase link --project-ref <ref>`
- [ ] `supabase db push` to apply the migrations in `supabase/migrations/`
- [ ] `supabase db seed` (uses `supabase/seed.sql`) to insert the Mahakur clinic + a Demo Clinic for cross-tenant tests
- [ ] `npm run dev` and confirm the placeholder home page renders (Poppins is fetched and self-hosted automatically by `next/font/google` — no manual download)
- [ ] (Optional) Initialise Storybook once you have your first component: `npx storybook@latest init`
- [ ] (Optional) Push to GitHub and connect to Vercel for preview deploys

---

## Project structure

```
doctorkart/
├─ src/
│  ├─ app/                     # Next.js App Router routes
│  │  ├─ (clinic-site)/        # public clinic site (per tenant)
│  │  ├─ (clinic-app)/         # /admin/* clinic dashboard
│  │  ├─ (super-admin)/        # /superadmin/* Doctor Kart staff
│  │  ├─ (patient)/            # /me/* patient portal
│  │  ├─ (marketing)/          # apex marketing site
│  │  ├─ api/                  # webhooks, cron
│  │  ├─ fonts/                # Poppins woff2 files (gitignored)
│  │  ├─ fonts.ts              # next/font/local setup
│  │  ├─ layout.tsx            # root layout
│  │  └─ page.tsx              # tenant home (temporary placeholder)
│  ├─ components/
│  │  ├─ ui/                   # shadcn primitives (do not edit by hand)
│  │  ├─ atoms/                # Doctor Kart custom atoms
│  │  ├─ molecules/            # combinations of atoms
│  │  ├─ compositions/         # screen-level pieces
│  │  └─ layouts/              # PublicSiteLayout, ClinicAppLayout, etc.
│  ├─ lib/
│  │  ├─ supabase/             # client + server helpers, RLS-aware
│  │  ├─ wa/                   # WhatsApp provider abstraction
│  │  └─ utils.ts
│  ├─ hooks/
│  ├─ middleware.ts            # tenant resolution from subdomain
│  └─ styles/
│     ├─ tokens.css            # CSS custom properties (design tokens)
│     └─ globals.css
├─ supabase/
│  ├─ migrations/              # SQL migrations (versioned)
│  └─ seed.sql                 # demo data for local dev
├─ design/
│  ├─ refs/                    # claude.ai/design exports per screen
│  └─ inventory.md             # component inventory + screen index
├─ .claude/
│  └─ commands/                # Claude Code slash commands
├─ .storybook/                 # Storybook config
├─ messages/                   # next-intl locale files (en/hi/or)
├─ public/                     # static assets
├─ .env.local.example
├─ tailwind.config.ts
├─ tsconfig.json
└─ package.json
```

---

## How tenant resolution works

Every request enters Next.js Edge middleware (`src/middleware.ts`) which:

1. Reads the `Host` header (e.g. `mahakur.doctorkart.in` or `drmahakur.com`).
2. Looks up the matching clinic in Supabase (cached).
3. Stashes `clinic_id` and `clinic_slug` into request headers so every Server Component, Server Action, and route handler can read it.

In dev, you can simulate tenants by editing `/etc/hosts` or by appending `?clinic=mahakur` (dev-only).

---

## Useful commands

```bash
npm run dev               # dev server
npm run build             # production build
npm run start             # serve production build
npm run lint              # eslint + typecheck
npm run typecheck         # tsc --noEmit
# Storybook is added later via: npx storybook@latest init
supabase db push          # apply migrations to linked project
supabase db reset         # nuke local DB and re-apply migrations + seed
```

---

## Where to look next

- `design/inventory.md` — running list of every screen + component (read first).
- `supabase/migrations/0001_initial_schema.sql` — the v1 data model.
- `src/middleware.ts` — tenant resolution.
- `src/styles/tokens.css` + `tailwind.config.ts` — the design system.

Refer to **DoctorKart_TechnicalImplementation.docx** (in the parent `Healthcare/` folder) for the full architecture spec.
