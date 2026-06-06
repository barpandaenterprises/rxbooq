import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminMessages } from "@/components/compositions/AdminMessages";
import { getAdminMessagesData } from "@/lib/data/admin-messages";

export const metadata = {
  title: "Messages",
};

export default async function AdminMessagesPage() {
  const initialThreads = await getAdminMessagesData();
  return (
    <ClinicAppLayout active="Messages">
      <AdminMessages initialThreads={initialThreads} />
    </ClinicAppLayout>
  );
}
