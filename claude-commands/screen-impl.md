---
description: Implement a Doctor Kart screen from the design refs end-to-end.
arguments:
  - name: screen
    description: Screen number + name, e.g. "02-booking-step1"
    required: true
---

You are implementing a screen for the Doctor Kart Next.js 14 (App Router) + Supabase
application. Use TypeScript, Tailwind, and shadcn/ui primitives only. Mobile-first.

## Read these files before writing any code

- `design/refs/{{screen}}/desktop.png`
- `design/refs/{{screen}}/mobile.png`
- `design/refs/{{screen}}/prompt.md` (original design prompt)
- `src/styles/tokens.css` (CSS custom properties)
- `tailwind.config.ts` (Tailwind tokens)
- `design/inventory.md` (component inventory — reuse, don't recreate)
- `DoctorKart_TechnicalImplementation.docx` (architecture and §4 design system)

## Goal

Implement the screen at the route mapped in `design/inventory.md`. Reuse existing
primitives wherever possible; only add new molecules / compositions if no
existing one fits — and update `design/inventory.md` accordingly.

## Hard constraints

- Tailwind utility classes mapped to our tokens. Never hard-code hex colours.
- Mobile-first; add `md:` and `lg:` variants per the design exports.
- Copy strings come from `messages/{en,hi,or}.json` via `next-intl`.
- Forms use `react-hook-form` + Zod. Schemas live in `src/lib/schemas/`.
- Server data: a function in `src/lib/supabase/<module>.ts`. Page is a Server
  Component; interactive children are Client Components.
- Add a Storybook story with mock fixtures co-located with the component.
- Do not introduce new dependencies. Ask first if you think one is required.

## Acceptance

- Pixel-diff against the design refs in Chromatic must be < 1.5% drift.
- All interactive elements have an accessible name; the page passes axe checks.
- The component compiles with strict TypeScript and no `any`.
- Loading + empty states have Storybook variants.
- A second seeded clinic ("Demo Clinic") renders the page correctly with no
  code changes.

When done, update `design/inventory.md` with status, owner, and PR link.
