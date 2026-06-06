import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminTeam } from "@/components/compositions/AdminTeam";
import { getAdminTeamData, getClinicDoctorOptions } from "@/lib/data/admin-team";

export const metadata = {
  title: "Team",
};

export default async function AdminTeamPage() {
  const [members, doctorOptions] = await Promise.all([
    getAdminTeamData(),
    getClinicDoctorOptions(),
  ]);
  return (
    <ClinicAppLayout active="Settings">
      <AdminTeam initialMembers={members} doctorOptions={doctorOptions} />
    </ClinicAppLayout>
  );
}
