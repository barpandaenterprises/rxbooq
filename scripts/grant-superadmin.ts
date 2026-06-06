/**
 * /grant-superadmin — set raw_app_meta_data.role = 'superadmin' on an auth user.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/grant-superadmin.ts <email>
 *
 * Equivalent to the SQL snippet in supabase/migrations/0006_simple_auth.sql,
 * but via the Supabase admin API so it goes through the same code path Auth
 * uses for token refreshes — no manual jsonb_set + cache invalidation needed.
 *
 * The user must sign out + sign in once for the new claim to land in their
 * session token.
 */

import { args, die, findAuthUserByEmail, info, ok, run, svc, warn } from "./_lib";

run(async () => {
  const [email] = args(["email"]);

  const user = await findAuthUserByEmail(email!);
  if (!user) die(`No auth user with email "${email}".`);

  const { data: { user: full }, error: getErr } = await svc().auth.admin.getUserById(user.id);
  if (getErr || !full) die(`Could not read user: ${getErr?.message}`);

  const currentRole = (full.app_metadata?.role as string | undefined) ?? null;
  if (currentRole === "superadmin") {
    warn(`${email} is already a superadmin.`);
    return;
  }

  const { error } = await svc().auth.admin.updateUserById(user.id, {
    app_metadata: { ...full.app_metadata, role: "superadmin" },
  });
  if (error) die(`Update failed: ${error.message}`);

  ok(`Granted superadmin to ${email}.`);
  info(`Ask them to sign out + sign in once so the new claim lands in their session.`);
});
