import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminMessages } from "@/components/compositions/AdminMessages";

export const metadata = {
  title: "Messages",
};

export default function AdminMessagesPage() {
  return (
    <ClinicAppLayout active="Messages">
      <AdminMessages />
    </ClinicAppLayout>
  );
}
