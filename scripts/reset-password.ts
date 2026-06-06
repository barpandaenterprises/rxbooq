/**
 * /reset-password — reset an auth user's password via the Supabase admin API.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/reset-password.ts <email> [new-password]
 *
 * If no password is supplied, a strong 14-char one is generated and printed
 * to stdout (the only place it'll ever be visible — share it out of band).
 *
 * Goes via supabase.auth.admin.updateUserById which routes through GoTrue
 * (same hashing/validation as the dashboard) rather than raw SQL on
 * auth.users.encrypted_password. Cleaner audit trail; respects whatever
 * password policy your Supabase project has configured.
 *
 * NOTE: existing sessions/refresh-tokens may stay valid until they naturally
 * expire (typically up to 1 hour for the access token, 7 days for the
 * refresh token). Re-running this is fine — it's idempotent.
 */

import { randomBytes } from "node:crypto";
import { args, die, findAuthUserByEmail, info, ok, run, svc, warn } from "./_lib";

// Avoid characters that are awkward to share over chat: no ` ' " \ / etc.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%*";

function generatePassword(length = 14): string {
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[buf[i]! % ALPHABET.length];
  }
  // Guarantee at least one digit + one symbol — the random pick almost always
  // covers it but be defensive against GoTrue's strength check.
  if (!/[0-9]/.test(out)) out = out.slice(0, -1) + "7";
  if (!/[!@#$%*]/.test(out)) out = out.slice(0, -2) + "!" + out.slice(-1);
  return out;
}

run(async () => {
  const [email, providedPassword] = args(["email"]).concat(process.argv.slice(3));

  const user = await findAuthUserByEmail(email!);
  if (!user) die(`No auth user with email "${email}".`);

  const newPassword = providedPassword?.trim() ? providedPassword.trim() : generatePassword();
  if (newPassword.length < 8) {
    die(`Password must be at least 8 characters (got ${newPassword.length}).`);
  }

  const { error } = await svc().auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) die(`Password update failed: ${error.message}`);

  ok(`Password reset for ${email}.`);
  console.log();
  info(`New password: ${newPassword}`);
  console.log();
  if (!providedPassword) {
    warn(`This is the only place the password will be visible. Copy it now.`);
  }
  info(`Ask the user to sign in at /login and change it from their account settings.`);
  info(`Existing sessions (if any) stay valid for ~1 hour until the JWT expires.`);
});
