/**
 * /seed-test-clinic — provision a fully-populated demo clinic in one shot.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-test-clinic.ts <slug> <name> <founder-email>
 *
 * What it creates:
 *   - clinics row (status='active', plan_id=Practice trial, verification_status='verified')
 *   - auth user for founder (random password printed to stdout) — skipped if they
 *     already exist; uses the existing user instead
 *   - clinic_users row linking founder as clinic_admin
 *   - 2 doctors (with weekly availability)
 *   - 3 services (consultation / cleaning / extraction)
 *   - 5 patients with Indian names
 *   - 3 sample appointments today
 *   - subscriptions row (status='trialing', 14-day trial on Practice plan)
 *
 * Safe to re-run with the same slug: skips if a clinic with that slug already
 * exists. To start fresh, /delete-test-clinic first.
 */

import { args, die, info, ok, run, svc, warn } from "./_lib";

run(async () => {
const [slug, clinicName, founderEmail] = args(["slug", "clinic-name", "founder-email"]);

if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug!)) {
  die(`Invalid slug "${slug}" — must be kebab-case (lowercase letters, digits, dashes).`);
}

const sb = svc();

// ---- 1. Refuse if the slug is taken -----------------------------------------
const { data: existing } = await sb.from("clinics").select("id").eq("slug", slug!).maybeSingle();
if (existing) die(`A clinic with slug "${slug}" already exists. Run /delete-test-clinic first if this is throwaway data.`);

// ---- 2. Resolve the Practice plan -------------------------------------------
const { data: plan } = await sb
  .from("subscription_plans")
  .select("id, monthly_price_inr, included_doctor_seats, extra_seat_price_inr")
  .eq("code", "practice")
  .maybeSingle();
if (!plan) die(`No 'practice' subscription plan seeded. Run supabase db push first.`);

// ---- 3. Founder auth user ---------------------------------------------------
let founderId: string;
const { data: { users } } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
const found = users.find((u) => u.email?.toLowerCase() === founderEmail!.toLowerCase());

if (found) {
  founderId = found.id;
  warn(`Auth user ${founderEmail} already exists — reusing.`);
} else {
  const tempPassword = `Demo!${Math.random().toString(36).slice(2, 10)}A1`;
  const { data: created, error } = await sb.auth.admin.createUser({
    email:         founderEmail!,
    password:      tempPassword,
    email_confirm: true,
  });
  if (error || !created.user) die(`auth.admin.createUser failed: ${error?.message}`);
  founderId = created.user.id;
  ok(`Created auth user ${founderEmail} with password: ${tempPassword}`);
  info(`(Save it — Supabase Auth won't show it again.)`);
}

// ---- 4. Clinic --------------------------------------------------------------
const { data: clinic, error: clinicErr } = await sb
  .from("clinics")
  .insert({
    slug:                slug!,
    name:                clinicName!,
    status:              "active",
    locale_default:      "en",
    locales:             ["en"],
    whatsapp_number:     "+919999900000",
    plan_id:             plan.id,
    verification_status: "verified",
    verified_at:         new Date().toISOString(),
  })
  .select("id")
  .single();
if (clinicErr || !clinic) die(`clinic insert failed: ${clinicErr?.message}`);
ok(`Clinic /${slug} created (id=${clinic.id})`);

// ---- 5. clinic_users (founder as clinic_admin) -----------------------------
await sb.from("clinic_users").insert({
  clinic_id:    clinic.id,
  auth_user_id: founderId,
  role:         "clinic_admin",
  display_name: clinicName!.split(/\s+/)[0] ?? "Admin",
  email:        founderEmail!,
});
ok(`Founder ${founderEmail} linked as clinic_admin`);

// ---- 6. Departments (free Practice tier limits to 5 — we seed 2) -----------
const departments = ["General Medicine", "Pediatrics"];
const { data: deptRows } = await sb
  .from("departments")
  .insert(departments.map((name, i) => ({
    clinic_id:     clinic.id,
    name,
    slug:          name.toLowerCase().replace(/\s+/g, "-"),
    display_order: i + 1,
  })))
  .select("id, slug");

// ---- 7. Doctors -------------------------------------------------------------
const doctorSeeds = [
  { name: "Dr. Asha Iyer",     qual: "MBBS, MD (Internal Medicine)", spec: "General Medicine", years: 12, dept: deptRows?.[0]?.id },
  { name: "Dr. Ravi Krishnan", qual: "MBBS, MD (Pediatrics)",        spec: "Pediatrics",       years: 9,  dept: deptRows?.[1]?.id },
];
const { data: docRows } = await sb
  .from("doctors")
  .insert(doctorSeeds.map((d, i) => ({
    clinic_id:         clinic.id,
    display_name:      d.name,
    qualifications:    d.qual,
    primary_specialty: d.spec,
    years_experience:  d.years,
    department_id:     d.dept,
    languages:         ["en", "hi"],
    status:            "active",
    is_active:         true,
    display_order:     i + 1,
  })))
  .select("id, display_name");
ok(`${docRows?.length ?? 0} doctors created`);

// Weekly availability — Mon–Sat 09:00–13:00 + 16:00–19:00 for each doctor.
if (docRows && docRows.length > 0) {
  const avail: Array<{ clinic_id: string; doctor_id: string; weekday: number; start_time: string; end_time: string; slot_minutes: number }> = [];
  for (const d of docRows) {
    for (let wd = 1; wd <= 6; wd++) {
      avail.push({ clinic_id: clinic.id, doctor_id: d.id, weekday: wd, start_time: "09:00", end_time: "13:00", slot_minutes: 15 });
      avail.push({ clinic_id: clinic.id, doctor_id: d.id, weekday: wd, start_time: "16:00", end_time: "19:00", slot_minutes: 15 });
    }
  }
  await sb.from("doctor_availability").insert(avail);
  ok(`Availability windows added (Mon–Sat morning + evening per doctor)`);
}

// ---- 8. Services ------------------------------------------------------------
await sb.from("services").insert([
  { clinic_id: clinic.id, name: "Consultation",       duration_minutes: 15, price_inr: 500,  display_order: 1 },
  { clinic_id: clinic.id, name: "Follow-up visit",    duration_minutes: 10, price_inr: 300,  display_order: 2 },
  { clinic_id: clinic.id, name: "Pediatric checkup",  duration_minutes: 20, price_inr: 700,  display_order: 3 },
]);
ok(`3 services created`);

// ---- 9. Patients (5 demo) ---------------------------------------------------
const patientSeeds = [
  { name: "Priya Sharma",   phone: "+919811111101", lang: "hi" },
  { name: "Karthik Rao",    phone: "+919811111102", lang: "en" },
  { name: "Bidyut Panda",   phone: "+919811111103", lang: "or" },
  { name: "Anjali Mehta",   phone: "+919811111104", lang: "en" },
  { name: "Sunil Yadav",    phone: "+919811111105", lang: "hi" },
];
const { data: patRows } = await sb
  .from("patients")
  .insert(patientSeeds.map((p) => ({
    clinic_id:        clinic.id,
    full_name:        p.name,
    phone_e164:       p.phone,
    phone_verified:   true,
    language:         p.lang,
    whatsapp_opt_in:  true,
  })))
  .select("id");
ok(`${patRows?.length ?? 0} demo patients created`);

// ---- 10. Sample appointments today ------------------------------------------
if (docRows && patRows && docRows.length > 0 && patRows.length > 0) {
  const todayIstY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const slotsIst = ["10:00", "10:30", "11:15"];
  await sb.from("appointments").insert(slotsIst.map((hhmm, i) => {
    const starts = new Date(`${todayIstY}T${hhmm}:00+05:30`);
    const ends   = new Date(starts.getTime() + 15 * 60_000);
    return {
      clinic_id:  clinic.id,
      patient_id: patRows[i % patRows.length]!.id,
      doctor_id:  docRows[i % docRows.length]!.id,
      starts_at:  starts.toISOString(),
      ends_at:    ends.toISOString(),
      status:     i === 0 ? "completed" : "confirmed",
      source:     "site",
    };
  }));
  ok(`3 sample appointments scheduled for today`);
}

// ---- 11. Subscription row ---------------------------------------------------
const trialEnd = new Date(Date.now() + 14 * 86_400_000);
await sb.from("subscriptions").insert({
  clinic_id:            clinic.id,
  plan_id:              plan.id,
  status:               "trialing",
  trial_ends_at:        trialEnd.toISOString(),
  current_period_start: new Date().toISOString(),
  current_period_end:   trialEnd.toISOString(),
  extra_seats:          0,
});
ok(`Subscription created — 14-day trial on Practice (ends ${trialEnd.toISOString().slice(0, 10)})`);

console.log();
ok(`Done. Visit:`);
info(`  Public profile : http://localhost:3000/d/${slug}`);
info(`  Admin app      : http://localhost:3000/admin/today (sign in as ${founderEmail})`);
});
