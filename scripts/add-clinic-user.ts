/**
 * /add-clinic-user — link an existing auth user to a clinic with a role.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/add-clinic-user.ts <email> <slug> <role>
 *
 * Roles: clinic_admin | doctor | receptionist
 *
 * Idempotent: if the user already has a clinic_users row, prints the existing
 * row instead of erroring (most common when running this during setup).
 */

import { args, die, findAuthUserByEmail, findClinicBySlug, info, ok, run, svc, warn } from "./_lib";

const VALID_ROLES = ["clinic_admin", "doctor", "receptionist"] as const;
type Role = (typeof VALID_ROLES)[number];

run(async () => {
  const [email, slug, roleArg] = args(["email", "clinic-slug", "role"]);
  const role = (roleArg as Role);
  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    die(`Invalid role "${roleArg}". Allowed: ${VALID_ROLES.join(", ")}`);
  }

  const user = await findAuthUserByEmail(email!);
  if (!user) die(`No auth user with email "${email}". Have them sign up first, or create via Supabase dashboard → Authentication → Users.`);

  const clinic = await findClinicBySlug(slug!);
  if (!clinic) die(`No clinic with slug "${slug}".`);

  // Check existing membership.
  const { data: existing } = await svc()
    .from("clinic_users")
    .select("id, role, clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing && existing.clinic_id === clinic.id) {
    warn(`${email} is already in ${clinic.name} as ${existing.role}.`);
    return;
  }
  if (existing) {
    die(`${email} is already linked to a different clinic (id=${existing.clinic_id}). Use /transfer-clinic-admin to move.`);
  }

  const { error } = await svc().from("clinic_users").insert({
    clinic_id:    clinic.id,
    auth_user_id: user.id,
    role,
    email:        user.email,
  });

  if (error) die(`Insert failed: ${error.message}`);

  ok(`Added ${email} → ${clinic.name} as ${role}.`);
  info(`Sign in at /login then visit /admin/today.`);
});
