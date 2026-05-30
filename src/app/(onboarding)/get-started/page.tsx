import { PhoneOtpStep } from "@/components/onboarding/PhoneOtpStep";

export default function GetStartedLanding() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">
          Free to start
        </p>
        <h2 className="mt-1 text-[28px] font-semibold leading-tight text-heading md:text-[32px]">
          Your clinic, in front of patients today.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[14px] text-muted">
          Get a public profile, online appointment booking, and patient messaging — set up in under 5 minutes. No card required.
        </p>
      </div>

      <PhoneOtpStep />

      <p className="text-center text-[12px] text-muted">
        Already started?{" "}
        <a href="/get-started/resume" className="font-medium text-link-hover no-underline">
          Resume an application
        </a>
      </p>
    </div>
  );
}
