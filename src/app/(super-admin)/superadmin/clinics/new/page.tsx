import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { SuperAdminOnboardWizard } from "@/components/compositions/SuperAdminOnboardWizard";

export const metadata = {
  title: "Onboard clinic · Super-admin",
};

export default function SaOnboardPage() {
  return (
    <SuperAdminLayout active="Onboarding queue" slim>
      <SuperAdminOnboardWizard />
    </SuperAdminLayout>
  );
}
