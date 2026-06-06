/**
 * /verify-clinic — flip a clinic's verification_status to 'verified' immediately.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/verify-clinic.ts <slug>
 *
 * Use case: sales demos where you don't want the clinic to show a "pending"
 * badge on its public profile. The async review queue at /superadmin/verifications
 * still works for real applicants; this is the operator shortcut.
 */

import { args, die, findClinicBySlug, info, ok, run, svc, warn } from "./_lib";

run(async () => {
  const [slug] = args(["clinic-slug"]);

  const clinic = await findClinicBySlug(slug!);
  if (!clinic) die(`No clinic with slug "${slug}".`);

  const { data: current } = await svc()
    .from("clinics")
    .select("verification_status")
    .eq("id", clinic.id)
    .single();

  if (current?.verification_status === "verified") {
    warn(`${clinic.name} is already verified.`);
    return;
  }

  const { error } = await svc()
    .from("clinics")
    .update({
      verification_status: "verified",
      verified_at:         new Date().toISOString(),
      // verified_by left null when set via script (no auth user context).
    })
    .eq("id", clinic.id);

  if (error) die(error.message);

  ok(`${clinic.name} marked as verified.`);
  info(`Their /d/${clinic.slug} profile now shows the Verified badge.`);
});
