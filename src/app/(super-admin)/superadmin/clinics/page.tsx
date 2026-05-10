import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { SuperAdminClinics } from "@/components/compositions/SuperAdminClinics";

export const metadata = {
  title: "Clinics · Super-admin",
};

export default function SaClinicsPage() {
  return (
    <SuperAdminLayout active="Clinics">
      <SuperAdminClinics />
    </SuperAdminLayout>
  );
}
