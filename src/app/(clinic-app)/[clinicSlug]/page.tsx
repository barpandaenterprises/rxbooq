import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadClinicForPublicPage } from "@/lib/data/public-clinic-page";
import { ClinicHomePage } from "@/components/compositions/ClinicHomePage";
import { isReservedSlug } from "@/lib/routing/reserved-slugs";

type Params = Promise<{ clinicSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { clinicSlug } = await params;
  if (isReservedSlug(clinicSlug)) return { title: "Not found" };
  const page = await loadClinicForPublicPage({ slug: clinicSlug });
  if (!page) return { title: "Clinic not found" };
  const { clinic } = page;
  const desc = clinic.pitch ?? `${clinic.name} — book an appointment online.`;
  return {
    title:       `${clinic.name} — Rxbooq`,
    description: desc.slice(0, 160),
    openGraph: {
      title:       clinic.name,
      description: desc.slice(0, 160),
    },
  };
}

export default async function ClinicProfilePage({ params }: { params: Params }) {
  const { clinicSlug } = await params;

  // Belt-and-braces: middleware already skips reserved segments via
  // x-active-clinic-slug, but a direct hit on /[reserved] still routes here
  // because Next.js matches the dynamic segment. notFound() is the right
  // response — the static route (e.g. /login) is what should serve.
  if (isReservedSlug(clinicSlug)) notFound();

  const page = await loadClinicForPublicPage({ slug: clinicSlug });
  if (!page) notFound();
  return <ClinicHomePage page={page} />;
}
