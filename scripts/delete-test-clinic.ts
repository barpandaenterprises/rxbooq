/**
 * /delete-test-clinic — delete a clinic and ALL of its related data.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/delete-test-clinic.ts <slug> [--yes] [--keep-users]
 *
 * Without --yes this is a DRY RUN: it prints what would be deleted and exits 0
 * without touching anything. Pass --yes to actually delete.
 *
 * What it removes:
 *   - The clinics row, which ON DELETE CASCADE removes every clinic-scoped
 *     child: clinic_users, doctors, doctor_availability, availability_overrides,
 *     patients, patient_users, medical_history, services, departments,
 *     appointments, clinic_slot_locks, visit_notes, visit_attachments,
 *     prescriptions, visit_tooth_treatments, otp_codes, wa_messages,
 *     subscriptions, coupon_redemptions.
 *   - clinic_applications rows pointing at this clinic (their FK is NO ACTION,
 *     so they'd otherwise block the delete) — removed explicitly first.
 *   - Orphaned auth users: the founder + any doctor/patient logins that were
 *     attached ONLY to this clinic. An auth user still linked to another clinic
 *     (multi-clinic membership) is kept. Superadmins are always kept. Skip this
 *     step entirely with --keep-users.
 *
 * What it intentionally keeps:
 *   - audit_logs rows (clinic_id is set to NULL by the FK — the audit trail
 *     survives the clinic).
 *   - Onboarding drafts (clinic_applications with no clinic_id) keyed by the
 *     founder's phone/email — those aren't this clinic's data.
 */

import { die, info, ok, run, svc, warn } from "./_lib";

run(async () => {
  const argv        = process.argv.slice(2);
  const flags       = new Set(argv.filter((a) => a.startsWith("--")));
  const positionals = argv.filter((a) => !a.startsWith("--"));
  const slug        = positionals[0];
  const confirmed   = flags.has("--yes");
  const keepUsers   = flags.has("--keep-users");

  if (!slug) die(`Usage: delete-test-clinic.ts <slug> [--yes] [--keep-users]`);

  const sb = svc();

  // ---- 1. Resolve the clinic -------------------------------------------------
  const { data: clinic, error: clinicErr } = await sb
    .from("clinics")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (clinicErr) die(`clinic lookup failed: ${clinicErr.message}`);
  if (!clinic) die(`No clinic with slug "${slug}". Nothing to delete.`);

  // ---- 2. Gather the headline counts + auth users (before anything changes) --
  const countOf = async (table: string): Promise<number> => {
    const { count } = await sb
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinic.id);
    return count ?? 0;
  };

  const [doctors, patients, appointments, members, subscriptions, applications] =
    await Promise.all([
      countOf("doctors"),
      countOf("patients"),
      countOf("appointments"),
      countOf("clinic_users"),
      countOf("subscriptions"),
      countOf("clinic_applications"),
    ]);

  // Auth user ids attached to this clinic, from every angle.
  const authIds = new Set<string>();
  const collect = async (table: string, col: string) => {
    const { data } = await sb.from(table).select(col).eq("clinic_id", clinic.id);
    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const id = row[col];
      if (typeof id === "string") authIds.add(id);
    }
  };
  await Promise.all([
    collect("clinic_users", "auth_user_id"),
    collect("patient_users", "auth_user_id"),
    collect("clinic_applications", "auth_user_id"),
  ]);

  // ---- 3. Preview ------------------------------------------------------------
  info(`Clinic : ${clinic.name}  (/${clinic.slug}, id=${clinic.id})`);
  info(`  doctors ............. ${doctors}`);
  info(`  patients ............ ${patients}`);
  info(`  appointments ........ ${appointments}`);
  info(`  team members ........ ${members}`);
  info(`  subscriptions ....... ${subscriptions}`);
  info(`  applications ........ ${applications}`);
  info(`  candidate auth users  ${authIds.size}${keepUsers ? " (kept: --keep-users)" : ""}`);
  info(`  + all other clinic-scoped rows via ON DELETE CASCADE`);

  if (!confirmed) {
    console.log();
    warn(`DRY RUN — nothing deleted. Re-run with --yes to delete the above.`);
    return;
  }

  // ---- 4. Clear clinic_applications (FK is NO ACTION → would block delete) ---
  if (applications > 0) {
    const { error } = await sb.from("clinic_applications").delete().eq("clinic_id", clinic.id);
    if (error) die(`failed to delete clinic_applications: ${error.message}`);
    ok(`Deleted ${applications} clinic_applications row(s)`);
  }

  // ---- 5. Delete the clinic → cascades to all child tables -------------------
  const { error: delErr } = await sb.from("clinics").delete().eq("id", clinic.id);
  if (delErr) die(`clinic delete failed: ${delErr.message}`);
  ok(`Deleted clinic /${clinic.slug} and all cascaded data`);

  // ---- 6. Remove now-orphaned auth users -------------------------------------
  if (keepUsers) {
    if (authIds.size > 0) info(`Kept ${authIds.size} auth user(s) (--keep-users).`);
    finishSummary(clinic.slug);
    return;
  }

  let deleted = 0;
  const kept: string[] = [];
  for (const id of authIds) {
    // Still a member of another clinic, or a patient login elsewhere?
    const [{ count: cuLeft }, { count: puLeft }] = await Promise.all([
      sb.from("clinic_users").select("id", { count: "exact", head: true }).eq("auth_user_id", id),
      sb.from("patient_users").select("auth_user_id", { count: "exact", head: true }).eq("auth_user_id", id),
    ]);
    if ((cuLeft ?? 0) > 0 || (puLeft ?? 0) > 0) {
      kept.push(`${id} (linked to another clinic)`);
      continue;
    }

    // Never delete a platform superadmin, even if otherwise orphaned.
    const { data: u } = await sb.auth.admin.getUserById(id);
    const role = (u?.user?.app_metadata as Record<string, unknown> | undefined)?.role;
    if (role === "superadmin") {
      kept.push(`${u?.user?.email ?? id} (superadmin)`);
      continue;
    }

    const { error } = await sb.auth.admin.deleteUser(id);
    if (error) {
      warn(`could not delete auth user ${id}: ${error.message}`);
      kept.push(`${id} (delete failed)`);
      continue;
    }
    deleted++;
  }
  if (deleted > 0) ok(`Deleted ${deleted} orphaned auth user(s)`);
  for (const k of kept) info(`Kept auth user: ${k}`);

  finishSummary(clinic.slug);
});

function finishSummary(slug: string): void {
  console.log();
  ok(`Done. /${slug} is gone — slug is free to reseed.`);
}
