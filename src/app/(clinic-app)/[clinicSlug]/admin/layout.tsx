import { redirect } from "next/navigation";
import { getCurrentStaffClinicId } from "@/lib/auth/current-user";

type Params = Promise<{ clinicSlug: string }>;

/**
 * Membership gate for the per-clinic admin app.
 *
 * The middleware-level auth gate already redirects unauthenticated users to
 * /login. This layout catches the second case: signed in, BUT not a member
 * of the URL's clinic — e.g. a doctor at /panda/admin/today tries opening
 * /mahakur/admin/today by typing it in the URL bar.
 *
 * `getCurrentStaffClinicId()` does both halves: it reads the slug from the
 * middleware-set x-active-clinic-slug header AND verifies the signed-in
 * user has a clinic_users row for that clinic. Null means "no access" —
 * bounce them to login so they can re-auth (or be told they have no clinic).
 */
export default async function ClinicAdminLayout({
  params,
  children,
}: {
  params:   Params;
  children: React.ReactNode;
}) {
  const { clinicSlug } = await params;
  const clinicId       = await getCurrentStaffClinicId();
  if (!clinicId) {
    redirect(`/login?next=/${clinicSlug}/admin/today`);
  }
  return <>{children}</>;
}
