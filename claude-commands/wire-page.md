---
description: Turn a Next.js route into a tenant-scoped Server Component that wires data into compositions.
arguments:
  - name: route
    description: App Router path, e.g. "(clinic-app)/admin/today/page.tsx"
    required: true
---

Implement the page at `src/app/{{route}}` as a thin Server Component.

The page must:

1. Read `headers()` to get `x-clinic-id` (already injected by middleware).
2. Refuse to render if the clinic isn't resolved (use `notFound()`).
3. Call typed data functions from `src/lib/supabase/<module>.ts` — never call
   the Supabase client inline in the page file.
4. Pass data to compositions from `@/components/compositions/*`. Page file is
   markup-light: data fetch + JSX composition.
5. Export `metadata` with a tenant-aware title.

If a needed data function doesn't exist, create it in `src/lib/supabase/` first,
typed against `Database` from `@/lib/supabase/database.types`. RLS handles
tenant scoping — do NOT pass `clinic_id` as a query parameter.
