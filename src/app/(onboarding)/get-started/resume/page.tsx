import { PhoneOtpStep } from "@/components/onboarding/PhoneOtpStep";

export default function ResumePage() {
  return (
    <div className="space-y-6">
      <PhoneOtpStep mode="resume" />
      <p className="text-center text-[12px] text-muted">
        New here?{" "}
        <a href="/get-started" className="font-medium text-link-hover no-underline">
          Start a fresh application
        </a>
      </p>
    </div>
  );
}
