import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminTeam } from "@/components/compositions/AdminTeam";
import { getAdminTeamData } from "@/lib/data/admin-team";

export const metadata = {
  title: "Team",
};

export default async function AdminTeamPage() {
  const members = await getAdminTeamData();
  return (
    <ClinicAppLayout active="Settings">
      <AdminTeam initialMembers={members} />
    </ClinicAppLayout>
  );
}
