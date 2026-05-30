-- =============================================================================
-- 0018_subscription_plans_crud.sql
-- Open up subscription_plans for runtime CRUD from /superadmin/plans.
--
-- 0014 hard-coded `code in ('free','visibility','practice','pro')` because the
-- seed was the only writer. Now that the superadmin UI can add/edit tiers, we
-- relax that to a shape-check only (lowercase letters/digits/dashes).
--
-- Everything else (RLS, sync trigger, FK from subscriptions) stays as-is.
-- =============================================================================

alter table public.subscription_plans
  drop constraint if exists subscription_plans_code_check;

alter table public.subscription_plans
  add constraint subscription_plans_code_check
  check (code ~ '^[a-z0-9][a-z0-9-]{1,40}$');

comment on column public.subscription_plans.code is
  'Stable kebab-case identifier. Surfaced in URLs (e.g. /get-started?plan=growth). Mutable from superadmin UI but breaking it strands existing ?plan= links.';
