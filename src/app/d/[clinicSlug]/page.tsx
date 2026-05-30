import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadClinicForPublicPage } from "@/lib/data/public-clinic-page";
import { ClinicHomePage } from "@/components/compositions/ClinicHomePage";

type Params = Promise<{ clinicSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { clinicSlug } = await params;
  const page = await loadClinicForPublicPage({ slug: clinicSlug });
  if (!page) return { title: "Clinic not found" };
  const { clinic } = page;
  const desc = clinic.pitch ?? `${clinic.name} — book an appointment online.`;
  return {
    title:       `${clinic.name} — DoctorKart`,
    description: desc.slice(0, 160),
    openGraph: {
      title:       clinic.name,
      description: desc.slice(0, 160),
    },
  };
}

export default async function ClinicProfilePage({ params }: { params: Params }) {
  const { clinicSlug } = await params;
  const page = await loadClinicForPublicPage({ slug: clinicSlug });
  if (!page) notFound();
  return <ClinicHomePage page={page} />;
}
