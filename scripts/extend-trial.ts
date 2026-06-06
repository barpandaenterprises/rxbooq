/**
 * /extend-trial — push trial_ends_at out by N days on a clinic's subscription.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/extend-trial.ts <slug> <days>
 *
 * Use case: sales says "give them 14 more days". Only operates on the
 * currently-in-flight subscription (trialing | active | past_due). No-op if
 * the clinic is already on Free / cancelled.
 */

import { args, die, findClinicBySlug, info, ok, run, svc, warn } from "./_lib";

run(async () => {
  const [slug, daysArg] = args(["clinic-slug", "days"]);
  const days = Number(daysArg);
  if (!Number.isFinite(days) || days <= 0 || days > 365) {
    die(`days must be a positive integer ≤ 365 (got "${daysArg}")`);
  }

  const clinic = await findClinicBySlug(slug!);
  if (!clinic) die(`No clinic with slug "${slug}".`);

  const { data: sub } = await svc()
    .from("subscriptions")
    .select("id, status, trial_ends_at, plan:subscription_plans ( display_name )")
    .eq("clinic_id", clinic.id)
    .in("status", ["trialing", "active", "past_due"])
    .maybeSingle();

  if (!sub) {
    warn(`${clinic.name} has no in-flight subscription. Nothing to extend.`);
    return;
  }

  const planName = (Array.isArray(sub.plan) ? sub.plan[0] : sub.plan)?.display_name ?? "(unknown plan)";

  if (sub.status !== "trialing") {
    warn(`Subscription is "${sub.status}" (not trialing). Refusing to set trial_ends_at on a paid subscription.`);
    info(`If you really want to convert this back to trialing, do it via /superadmin/subscriptions.`);
    return;
  }

  const current = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
  const next    = new Date(current.getTime() + days * 86_400_000);

  const { error } = await svc()
    .from("subscriptions")
    .update({ trial_ends_at: next.toISOString() })
    .eq("id", sub.id);

  if (error) die(error.message);

  ok(`${clinic.name} — ${planName} trial extended by ${days} day(s).`);
  info(`New trial_ends_at : ${next.toISOString()}`);
  info(`(was             : ${sub.trial_ends_at ?? "(null)"})`);
});
