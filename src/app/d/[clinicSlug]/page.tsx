import { permanentRedirect } from "next/navigation";

type Params = Promise<{ clinicSlug: string }>;

/**
 * Legacy URL. The canonical public profile lives at /[clinicSlug].
 * 308 redirect keeps any cached / bookmarked /d/{slug} links working.
 */
export default async function LegacyClinicProfileRedirect({ params }: { params: Params }) {
  const { clinicSlug } = await params;
  permanentRedirect(`/${clinicSlug}`);
}
