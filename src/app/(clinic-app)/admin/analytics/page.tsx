import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminAnalytics } from "@/components/compositions/AdminAnalytics";

export const metadata = {
  title: "Analytics",
};

export default function AdminAnalyticsPage() {
  return (
    <ClinicAppLayout active="Analytics">
      <AdminAnalytics />
    </ClinicAppLayout>
  );
}
