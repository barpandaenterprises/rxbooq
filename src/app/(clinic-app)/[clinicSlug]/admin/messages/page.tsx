import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminMessages } from "@/components/compositions/AdminMessages";
import { getAdminMessagesData } from "@/lib/data/admin-messages";
import { getActiveMembership } from "@/lib/auth/current-user";

export const metadata = {
  title: "Messages",
};

export default async function AdminMessagesPage() {
  const [initialThreads, membership] = await Promise.all([
    getAdminMessagesData(),
    getActiveMembership(),
  ]);
  // Doctors get a read-only inbox; only admins/receptionists can reply.
  const canReply = !membership || membership.role !== "doctor";
  return (
    <ClinicAppLayout active="Messages">
      <AdminMessages initialThreads={initialThreads} canReply={canReply} />
    </ClinicAppLayout>
  );
}
