import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serviceClient } from "@/lib/supabase/server";
import { COOKIE_NAME, verifyDraftCookie } from "@/lib/onboarding/draft-cookie";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { PracticeStep } from "@/components/onboarding/PracticeStep";
import { DocsUploadStep } from "@/components/onboarding/DocsUploadStep";
import { AccountStep } from "@/components/onboarding/AccountStep";

type Params       = Promise<{ draftId: string }>;
type SearchParams = Promise<{ step?: string }>;

const VALID_STEPS = ["profile", "practice", "docs", "account"] as const;
type Step = (typeof VALID_STEPS)[number];

export default async function WizardHost({
  params,
  searchParams,
}: {
  params:       Params;
  searchParams: SearchParams;
}) {
  const { draftId } = await params;
  const { step }    = await searchParams;
  // The Plan step was removed — fold any lingering ?step=plan link (old drafts /
  // bookmarks) into the Account step so resume still lands somewhere sensible.
  const requested = step === "plan" ? "account" : (step ?? "");
  const currentStep: Step = (VALID_STEPS as readonly string[]).includes(requested)
    ? (requested as Step)
    : "profile";

  // Cookie gate — must match [draftId] in the URL.
  const cookieStore = await cookies();
  const claim = verifyDraftCookie(cookieStore.get(COOKIE_NAME)?.value);
  if (!claim || claim.draftId !== draftId) {
    redirect("/get-started/resume");
  }

  // Load the draft server-side.
  const supabase = serviceClient();
  const { data: draft } = await supabase
    .from("clinic_applications")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (!draft || draft.status !== "draft") {
    redirect("/get-started/resume");
  }

  return (
    <div>
      <OnboardingProgress currentStep={currentStep} />

      {currentStep === "profile"  && <ProfileStep  draft={draft} draftId={draftId} />}
      {currentStep === "practice" && <PracticeStep draft={draft} draftId={draftId} />}
      {currentStep === "docs"     && <DocsUploadStep draft={draft} draftId={draftId} />}
      {currentStep === "account"  && <AccountStep   draft={draft} />}
    </div>
  );
}
