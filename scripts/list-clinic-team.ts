/**
 * /list-clinic-team — print every clinic_users row for a clinic with role.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/list-clinic-team.ts <slug>
 */

import { args, die, findClinicBySlug, info, ok, run, svc } from "./_lib";

run(async () => {
  const [slug] = args(["clinic-slug"]);

  const clinic = await findClinicBySlug(slug!);
  if (!clinic) die(`No clinic with slug "${slug}".`);

  const { data: rows, error } = await svc()
    .from("clinic_users")
    .select("display_name, email, phone, role, auth_user_id, created_at")
    .eq("clinic_id", clinic.id)
    .order("created_at", { ascending: true });

  if (error) die(error.message);

  ok(`${clinic.name} (/${clinic.slug}) — ${rows?.length ?? 0} team member(s)`);
  console.log();

  if (!rows || rows.length === 0) {
    info("(no team members — clinic has no signed-in staff)");
    return;
  }

  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  console.log(`  ${pad("ROLE", 14)} ${pad("NAME", 28)} ${pad("EMAIL", 36)} ${pad("PHONE", 16)} JOINED`);
  console.log(`  ${"-".repeat(14)} ${"-".repeat(28)} ${"-".repeat(36)} ${"-".repeat(16)} ----------`);
  for (const r of rows) {
    console.log(
      `  ${pad(r.role, 14)} ${pad(r.display_name ?? "(no name)", 28)} ${pad(r.email ?? "—", 36)} ${pad(r.phone ?? "—", 16)} ${(r.created_at ?? "").slice(0, 10)}`,
    );
  }
});
