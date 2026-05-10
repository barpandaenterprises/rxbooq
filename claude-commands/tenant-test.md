---
description: Generate a cross-tenant isolation test for a feature.
arguments:
  - name: feature
    description: Feature module name, e.g. "appointments"
    required: true
---

Generate a Vitest test file at `src/lib/supabase/__tests__/{{feature}}.tenant.test.ts`
that proves Clinic A cannot read or write Clinic B data through any function
exported by `src/lib/supabase/{{feature}}.ts`.

The test must:

1. Use the seeded `mahakur` and `democlinic` clinics from `supabase/seed.sql`.
2. Authenticate as a `mahakur` clinic_admin and:
   - Assert every list-read returns only `mahakur` rows.
   - Assert any write that targets `democlinic` data fails (RLS rejection).
3. Authenticate as a `democlinic` clinic_admin and assert symmetric behaviour.
4. Authenticate as a super-admin and assert it CAN read across tenants.

Failing this test must block CI. Add the file to the existing tenant-isolation
suite registered in `vitest.config.ts`.
