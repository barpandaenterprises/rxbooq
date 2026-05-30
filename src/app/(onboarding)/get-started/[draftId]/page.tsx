import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serviceClient } from "@/lib/supabase/server";
import { COOKIE_NAME, verifyDraftCookie } from "@/lib/onboarding/draft-cookie";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { PracticeStep } from "@/components/onboarding/PracticeStep";
import { DocsUploadStep } from "@/components/onboarding/DocsUploadStep";
import { PlanPickerStep } from "@/components/onboarding/PlanPickerStep";
import { AccountStep } from "@/components/onboarding/AccountStep";

type Params       = Promise<{ draftId: string }>;
type SearchParams = Promise<{ step?: string }>;

const VALID_STEPS = ["profile", "practice", "docs", "plan", "account"] as const;
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
  const currentStep: Step = (VALID_STEPS as readonly string[]).includes(step ?? "")
    ? (step as Step)
    : "profile";

  // Cookie gate — must match [draftId] in the URL.
  const cookieStore = await cookies();
  const claim = verifyDraftCookie(cookieStore.get(COOKIE_NAME)?.value);
  if (!claim || claim.draftId !== draftId) {
    redirect("/get-started/resume");
  }

  // Load the draft + plan catalog server-side.
  const supabase = serviceClient();
  const [{ data: draft }, { data: plans }] = await Promise.all([
    supabase
      .from("clinic_applications")
      .select("*")
      .eq("id", draftId)
      .maybeSingle(),
    supabase
      .from("subscription_plans")
      .select("id, code, display_name, tagline, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, features, is_popular, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (!draft || draft.status !== "draft") {
    redirect("/get-started/resume");
  }

  return (
    <div>
      <OnboardingProgress currentStep={currentStep} />

      {currentStep === "profile"  && <ProfileStep  draft={draft} draftId={draftId} />}
      {currentStep === "practice" && <PracticeStep draft={draft} draftId={draftId} />}
      {currentStep === "docs"     && <DocsUploadStep draft={draft} draftId={draftId} />}
      {currentStep === "plan"     && <PlanPickerStep draft={draft} draftId={draftId} plans={plans ?? []} />}
      {currentStep === "account"  && <AccountStep   draft={draft} />}
    </div>
  );
}
