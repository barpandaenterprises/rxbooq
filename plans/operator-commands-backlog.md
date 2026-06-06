# Operator commands & agents — backlog

Candidate slash commands we evaluated and parked for later. The first batch of
10 shipped in `.claude/commands/` + `scripts/` — those answered the highest-
frequency operator tasks (linking users, granting superadmin, seeding demo
clinics, extending trials, etc.).

This list captures the remaining 36 so they don't get lost. Each entry has:
just enough spec to scope. When we build one, we expand it into a full
`.claude/commands/<name>.md` + `scripts/<name>.ts` pair following the pattern
the shipped 10 use.

**Type key**:
- **cmd** — parameterised one-shot (a `scripts/<name>.ts` + `.claude/commands/<name>.md`)
- **agent** — multi-step with judgment, lives as a subagent or a richer command

**Priority key**:
- **P1** — used weekly or guards against high-impact bugs; build next
- **P2** — used occasionally; build when the need hits
- **P3** — nice-to-have; build when there's spare time

---

## A. User & role management

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/revoke-superadmin` | Clear `raw_app_meta_data.role` flag — symmetric with `/grant-superadmin`. Refuse if it's the last superadmin in the system. | email | cmd | P2 |
| `/transfer-clinic-admin` | Move a `clinic_users` row from one clinic to another. Lets us switch a clinic_admin between tenants without delete-then-add. | email, new clinic slug | cmd | P2 |
| `/remove-clinic-user` | Delete a `clinic_users` row (revoke `/admin/*` access). Refuse if it's the only `clinic_admin` left on that clinic. | email, clinic slug | cmd | P2 |

## B. Clinic lifecycle

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/delete-test-clinic` | Hard-delete a clinic + cascade (patients, appointments, doctors, applications, storage uploads, subscription, redemptions). Refuse if `verification_status='verified'` or if MRR > 0 (safety rail). | clinic slug | cmd | **P1** — pair to `/seed-test-clinic` |
| `/suspend-clinic` | `clinics.status='suspended'` — kills booking + admin app, keeps public profile. | clinic slug, reason | cmd | P2 |
| `/reactivate-clinic` | Reverse `/suspend-clinic`. | clinic slug | cmd | P2 |
| `/rename-clinic-slug` | Change a clinic's slug. Must also re-cache anything keyed on slug (none currently, but check before changing). | old slug, new slug | cmd | P3 |

## C. Subscriptions & billing

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/force-plan-change` | Sales-assisted upgrade: switch a clinic to a different plan immediately (no Razorpay round-trip). Updates `clinics.plan_id` + `subscriptions.plan_id`. | clinic slug, plan code | cmd | **P1** |
| `/cancel-subscription` | Mark `subscriptions.status='cancelled'`. Clinic stays on Free. Should also cancel the Razorpay subscription if linked. | clinic slug | cmd | P2 |
| `/reset-to-free` | Force-downgrade to Free immediately (skip trial expiry cron). Useful for testing or refunds. | clinic slug | cmd | P2 |
| `/sync-razorpay-plans` | CLI wrapper around the existing `/superadmin/plans` sync button. Also creates Razorpay offers for any `recurring`-scope coupons that don't have a `razorpay_offer_id` yet. | — | cmd | **P1** — covers the missing recurring-coupon path |
| `/fake-razorpay-webhook` | POST a forged webhook event to local dev (with a valid HMAC) to exercise status transitions without paying. Supports `subscription.activated / charged / halted / cancelled`. | event name, subscription id | agent | P2 — multi-step (lookup secret, build payload, POST) |
| `/clinic-billing-history` | Print invoice ledger + coupon redemptions + Razorpay charge history for a clinic. | clinic slug | cmd | P2 |

## D. Coupons

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/new-coupon` | Insert a coupon row + (if `recurring` scope) create the Razorpay offer. Faster than the superadmin UI for bulk seeding. | code, kind, value, scope, partner email? | cmd | P2 |
| `/disable-coupon` | Flip `is_active=false` (kill switch). | code | cmd | P2 |
| `/coupon-redemptions` | List who redeemed a given coupon + total discount given. | code | cmd | P2 |
| `/partner-commission-report` | Sum redemptions by `partner_user_id` for a date range — feeds commission payouts. | partner email, date range | cmd | P3 |

## E. Onboarding draft cleanup

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/find-draft` | Look up an onboarding draft by phone, show progress + last step + which fields are still empty. | phone | cmd | **P1** — sales/support staple |
| `/resume-draft` | Set `last_step_completed` back to a given step (for "user says they're stuck" tickets). | phone, step | agent | P2 |
| `/finalize-stuck-draft` | Force-call `activate_clinic_application` for a draft that didn't finish on its own (e.g. browser crashed at finalize). Requires manually choosing the email/password. | draft id, email, password | agent | P2 |
| `/purge-old-drafts` | Hard-delete drafts older than N days that never reached the account step. Reclaims storage uploads too. | days (default 30) | cmd | P3 |

## F. Patient & booking ops

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/seed-test-patients` | Add N test patients to a clinic with realistic Indian names + WhatsApp opt-ins. | clinic slug, count | cmd | P2 |
| `/block-doctor-leave` | Bulk-create `availability_overrides` rows for a doctor's leave dates. | doctor id, date range, reason | cmd | P2 |
| `/cancel-future-appointments` | Cancel all future appointments for a doctor (with optional reschedule template). Useful when a doctor leaves. | doctor id | cmd | P3 |
| `/find-patient` | Lookup patient across all clinics by phone (superadmin-only, cross-tenant). | phone | cmd | P3 |

## G. Dev / release workflow

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/new-migration` | Scaffold a new `supabase/migrations/NNNN_name.sql` file with the project's standard header comment. Auto-increments the prefix. | name | cmd | **P1** — every schema change starts here |
| `/release-check` | Run lint + typecheck + build + grep for known footguns (TODO, console.log, hardcoded clinic ids, missing `clinic_id` filters). One-stop "ready to merge?" gate. | — | agent | **P1** |
| `/smoke-test-funnel` | Drive the onboarding funnel end-to-end via server actions: send OTP, verify (bypass), fill draft, finalize. Prints the new clinic id. Catches regressions before they hit users. | phone | agent | **P1** |
| `/regen-types` | `supabase gen types typescript --linked` + verify no `any` shows up in critical tables. Pair to `/db-reset-and-seed` when working on just types. | — | cmd | P2 |

## H. Debugging & investigation (agents)

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/diagnose-clinic` | Investigate why a clinic is broken: subscription state, RLS gotchas, missing rows, doc upload failures, recent errors in logs. Returns a punch list. | clinic slug | agent | **P1** — flagship investigative tool |
| `/diagnose-webhook` | Investigate why a Razorpay webhook didn't update our DB: re-verify signature against raw body, check event delivery log, compare against expected handler path. | razorpay subscription id | agent | P2 |
| `/rls-policy-tester` | Connect as anon + various staff roles + superadmin, run a battery of read queries against every clinic-scoped table, prove tenant isolation works. Defence against regressions to the bug we just fixed in tenant isolation. | — | agent | P2 |

## I. Reporting (agents — heavier)

| Name | What it does | Inputs | Type | P |
| --- | --- | --- | --- | --- |
| `/funnel-report` | Onboarding conversion: started → phone → profile → docs → plan → account → activated. Stage drop-off rates. | date range | agent | P2 |
| `/revenue-report` | MRR by tier, churn, ARR, top clinics by spend. | date range | agent | P2 |
| `/clinic-health-report` | Per-clinic: bookings/week, no-show rate, message volume, days since last login. Flag at-risk clinics. | clinic slug? (or all) | agent | P3 |
| `/feature-adoption-report` | What % of paid clinics actually use WhatsApp templates, EMR, departments, etc. Tells us where Free → paid friction lives. | — | agent | P3 |

---

## Next-batch suggestion

If we ship another 6, my pick (highest leverage, lowest effort):

1. **B2** `/delete-test-clinic` — pair to the seeder; right now we can't clean up demo clinics
2. **C2** `/force-plan-change` — sales-assisted upgrades; comes up every week
3. **C6** `/sync-razorpay-plans` — closes the missing recurring-coupon Razorpay-offer creation
4. **E1** `/find-draft` — support staple ("I started onboarding and got stuck")
5. **G1** `/new-migration` — every schema change starts here
6. **H1** `/diagnose-clinic` — first real agent; investigative; pays for itself the first time a clinic is broken

The other 30 stay parked here until they pull their weight.

---

## Convention reminder (so we stay consistent when adding more)

Each new command follows the pattern set by the first 10:

1. `scripts/<name>.ts` — runs under `npx tsx --env-file=.env.local`, uses `_lib.ts` helpers (`svc()`, `args()`, `ok/warn/info/die/run`), wraps the body in `run(async () => { … })`.
2. `.claude/commands/<name>.md` — frontmatter (`description`, `allowed-tools`) + body instructing me what to do, ending with `$ARGUMENTS`.
3. Reuse `findAuthUserByEmail(email)` / `findClinicBySlug(slug)` from `_lib.ts` for those lookups.
4. Idempotent where possible: re-running the same command with the same inputs should be safe (warn instead of error if the change is already applied).
5. Refuse destructive operations on real data: hard deletes guarded by `status` checks, MRR checks, or explicit confirmation.

Agents follow the same `.md` convention but are typically multi-step — they may call multiple scripts, read codebase context, and synthesise a report rather than just executing one SQL.
