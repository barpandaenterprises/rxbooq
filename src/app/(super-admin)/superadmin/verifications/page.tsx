import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import { getSignedOnboardingDocUrl } from "@/lib/supabase/storage";
import { VerificationActions } from "@/components/compositions/VerificationActions";

export const metadata = { title: "Verifications" };

export default async function VerificationsPage() {
  const supabase = serviceClient();

  // Clinics pending verification + their uploaded doc paths (joined via the
  // backing clinic_applications row).
  const { data: clinics } = await supabase
    .from("clinics")
    .select(`
      id, name, slug, verification_status, verified_at,
      application:clinic_applications!clinic_applications_clinic_id_fkey ( id, registration_cert_path, clinic_license_path, doctor_full_name, doctor_registration_no )
    `)
    .eq("verification_status", "pending")
    .order("name");

  // Sign URLs server-side so the page renders the certs inline.
  const rows = await Promise.all(
    (clinics ?? []).map(async (c) => {
      const app = (c.application as unknown as Array<{ registration_cert_path: string | null; clinic_license_path: string | null; doctor_full_name: string | null; doctor_registration_no: string | null }>)[0];
      const certUrl    = app?.registration_cert_path ? await getSignedOnboardingDocUrl(app.registration_cert_path) : null;
      const licenseUrl = app?.clinic_license_path    ? await getSignedOnboardingDocUrl(app.clinic_license_path)    : null;
      return {
        clinicId:    c.id,
        name:        c.name,
        slug:        c.slug,
        doctorName:  app?.doctor_full_name,
        doctorRegNo: app?.doctor_registration_no,
        certUrl,
        licenseUrl,
      };
    }),
  );

  return (
    <SuperAdminLayout active="Verifications">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Verification queue</h1>
          <p className="mt-1 text-[13px] text-muted">
            Clinics with uploaded documents awaiting review. Approval flips the public profile badge to &quot;Verified&quot;.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center text-[13px] text-muted">
            Nothing in the queue. New uploads land here automatically.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.clinicId} className="rounded-lg border border-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-heading">{r.name}</div>
                    <div className="text-[12px] text-muted">/{r.slug}</div>
                    {r.doctorName && <div className="mt-2 text-[12px] text-body">Founding doctor: <span className="font-medium text-heading">{r.doctorName}</span> · Reg #{r.doctorRegNo}</div>}
                  </div>
                  <VerificationActions clinicId={r.clinicId} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <DocLink label="Medical registration" url={r.certUrl} />
                  <DocLink label="Clinic license"       url={r.licenseUrl} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

function DocLink({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="rounded-md border border-border bg-[#fafbfc] p-3 text-[12px]">
      <div className="text-muted">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-link-hover no-underline">
          <i className="fas fa-external-link-alt text-[10px]" /> Open document
        </a>
      ) : (
        <div className="mt-1 text-[#9aa9b8]">Not uploaded</div>
      )}
    </div>
  );
}
