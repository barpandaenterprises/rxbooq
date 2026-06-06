/**
 * /whoami — answer "why can/can't this user sign in", and where do they land.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/whoami.ts <email>
 *
 * Prints: auth.users row, superadmin flag, clinic_users links, patient_users
 * links, last sign-in. Useful for "user says login isn't working" support.
 */

import { args, die, findAuthUserByEmail, info, ok, run, svc, warn } from "./_lib";

run(async () => {
const [email] = args(["email"]);

const lite = await findAuthUserByEmail(email!);
if (!lite) {
  warn(`No auth user with email "${email}".`);
  info(`They may have signed up with a different email, or not at all.`);
  return;
}

const { data: { user }, error } = await svc().auth.admin.getUserById(lite.id);
if (error || !user) die(`Could not read user: ${error?.message}`);

ok(`Found ${user.email}`);
console.log();
info(`auth.users.id           : ${user.id}`);
info(`email                   : ${user.email ?? "(none)"}`);
info(`phone                   : ${user.phone ?? "(none)"}`);
info(`email confirmed         : ${user.email_confirmed_at ? "yes" : "no"}`);
info(`phone confirmed         : ${user.phone_confirmed_at ? "yes" : "no"}`);
info(`last sign-in            : ${user.last_sign_in_at ?? "(never)"}`);
info(`created                 : ${user.created_at}`);
info(`superadmin?             : ${user.app_metadata?.role === "superadmin" ? "YES" : "no"}`);

const { data: cuRows } = await svc()
  .from("clinic_users")
  .select("clinic_id, role, display_name, created_at, clinics ( slug, name )")
  .eq("auth_user_id", user.id);

console.log();
if (!cuRows || cuRows.length === 0) {
  info("clinic_users links      : (none)");
} else {
  info("clinic_users links      :");
  for (const r of cuRows) {
    const c = Array.isArray(r.clinics) ? r.clinics[0] : r.clinics;
    info(`   /${c?.slug ?? "?"} (${c?.name ?? "?"}) — ${r.role} (since ${(r.created_at ?? "").slice(0, 10)})`);
  }
}

const { data: puRows } = await svc()
  .from("patient_users")
  .select("clinic_id, patient_id, clinics ( slug, name )")
  .eq("auth_user_id", user.id);

if (puRows && puRows.length > 0) {
  info("patient_users links     :");
  for (const r of puRows) {
    const c = Array.isArray(r.clinics) ? r.clinics[0] : r.clinics;
    info(`   /${c?.slug ?? "?"} (${c?.name ?? "?"}) — patient_id=${r.patient_id}`);
  }
}

console.log();
const where =
    user.app_metadata?.role === "superadmin" ? "/superadmin/clinics"
  : cuRows && cuRows.length > 0               ? "/admin/today"
  : puRows && puRows.length > 0               ? "/me/appointments"
  :                                             "(no app surface — they'll see the login page bounce)";
info(`On sign-in they land at : ${where}`);
});
