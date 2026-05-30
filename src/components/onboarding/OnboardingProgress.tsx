type Props = {
  /** One of: phone | profile | practice | docs | plan | account */
  currentStep: string;
};

const STEPS: { key: string; label: string }[] = [
  { key: "phone",    label: "Phone" },
  { key: "profile",  label: "Profile" },
  { key: "practice", label: "Practice" },
  { key: "docs",     label: "Documents" },
  { key: "plan",     label: "Plan" },
  { key: "account",  label: "Account" },
];

export function OnboardingProgress({ currentStep }: Props) {
  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.key === currentStep));
  const pct = Math.round(((currentIdx + 1) / STEPS.length) * 100);

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between text-[12px] font-medium uppercase tracking-wide text-muted">
        <span>Step {currentIdx + 1} of {STEPS.length}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-border">
        <div
          className="h-full bg-cta transition-all duration-300"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <ol className="mt-3 hidden gap-3 text-[12px] font-medium md:flex">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            className={
              "flex items-center gap-1.5 " +
              (i === currentIdx ? "text-heading"
               : i < currentIdx ? "text-muted line-through"
               : "text-[#9aa9b8]")
            }
          >
            <span className={
              "grid h-5 w-5 place-items-center rounded-pill text-[11px] " +
              (i <= currentIdx ? "bg-cta text-white" : "bg-border text-muted")
            }>
              {i < currentIdx ? <i className="fas fa-check text-[9px]" /> : i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
