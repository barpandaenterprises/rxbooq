type Props = {
  step: 1 | 2 | 3;
  labels?: [string, string, string];
};

const DEFAULT_LABELS: [string, string, string] = ["Service", "Slot", "Your details"];

export function BookingStepperHeader({ step, labels = DEFAULT_LABELS }: Props) {
  return (
    <div className="mb-8">
      {/* Desktop: full horizontal stepper */}
      <div className="hidden items-center md:flex">
        {labels.map((label, i) => {
          const idx = (i + 1) as 1 | 2 | 3;
          const active = idx === step;
          const done = idx < step;

          const dotClasses = active
            ? "bg-cta border-cta text-white"
            : done
              ? "bg-link-hover border-link-hover text-white"
              : "bg-white border-border text-[#9aa9b8]";

          const textColor = active ? "text-heading" : done ? "text-link-hover" : "text-[#9aa9b8]";
          const connectorBg = done ? "bg-link-hover" : "bg-border";

          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-none items-center gap-3">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-pill border-[1.5px] text-[13px] font-semibold ${dotClasses}`}
                >
                  {done ? <i className="fas fa-check text-[11px]" /> : idx}
                </div>
                <div className={`leading-[18px] ${textColor}`}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9aa9b8]">
                    Step {idx}
                  </div>
                  <div className={`text-[14px] ${active ? "font-semibold" : "font-normal"}`}>
                    {label}
                  </div>
                </div>
              </div>
              {idx < labels.length && (
                <div className={`mx-4 h-[1.5px] flex-1 ${connectorBg}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: pill dots */}
      <div className="flex items-center gap-3 md:hidden">
        <div className="flex gap-1.5">
          {labels.map((_, i) => {
            const idx = (i + 1) as 1 | 2 | 3;
            const active = idx === step;
            const done = idx < step;
            return (
              <div
                key={i}
                className={`h-2 rounded-pill transition-[width] duration-200 ${
                  active ? "w-7 bg-cta" : done ? "w-2 bg-link-hover" : "w-2 bg-border"
                }`}
              />
            );
          })}
        </div>
        <div className="text-[12px] font-medium text-muted">
          Step {step} of {labels.length}{" "}
          <span className="font-semibold text-heading">· {labels[step - 1]}</span>
        </div>
      </div>
    </div>
  );
}
