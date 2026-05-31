// Super-admin onboarding wizard — Step 2: Branding (representative; other steps stub the same shell)

const STEPS: Array<{ n: number; label: string; sub: string; ic: string }> = [
  { n: 1, label: "Clinic info",         sub: "Name, owner, address",      ic: "fa-clinic-medical" },
  { n: 2, label: "Branding",            sub: "Logo, colours, tagline",    ic: "fa-palette" },
  { n: 3, label: "Schedule & services", sub: "Hours, doctors, services",  ic: "fa-calendar-alt" },
  { n: 4, label: "WhatsApp & launch",   sub: "Number, templates, go-live", ic: "fab fa-whatsapp" },
];

const ACTIVE_STEP = 2;

function ProgressRail() {
  return (
    <aside className="hidden w-[300px] flex-none border-r border-border bg-white p-6 md:block">
      <div className="mb-7 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-[14px] text-white">
          <i className="fas fa-bolt" />
        </span>
        <div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-[#9aa9b8]">Onboard clinic</div>
          <div className="text-[15px] font-semibold text-heading">Mahima Dental</div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute bottom-4 left-3.5 top-4 w-[2px] bg-border" />
        {STEPS.map((s) => {
          const done = s.n < ACTIVE_STEP;
          const cur = s.n === ACTIVE_STEP;
          return (
            <div key={s.n} className="relative flex items-start gap-3.5 py-3">
              <span
                className="z-[1] grid h-[30px] w-[30px] flex-none place-items-center rounded-pill text-[12px] font-semibold text-white"
                style={{
                  background: done ? "#3a8b5e" : cur ? "#EE344E" : "#fff",
                  border: done || cur ? "0" : "2px solid #cdd9e4",
                  boxShadow: cur ? "0 0 0 4px rgba(238,52,78,0.15)" : "none",
                }}
              >
                {done ? (
                  <i className="fas fa-check text-[11px]" />
                ) : (
                  <span style={{ color: cur ? "#fff" : "#9aa9b8" }}>{s.n}</span>
                )}
              </span>
              <div className="pt-0.5">
                <div
                  className="text-[14px]"
                  style={{
                    fontWeight: cur ? 600 : 500,
                    color: cur ? "#EE344E" : done ? "#272B41" : "#9aa9b8",
                  }}
                >
                  {s.label}
                </div>
                <div className="mt-0.5 text-[12px] text-[#9aa9b8]">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-md bg-surface-muted p-3.5 text-[12px] text-muted">
        <i className="fas fa-info-circle mr-1.5 text-[12px] text-brand" />
        You can save as draft any time. Onboarding usually takes ~12 minutes end-to-end.
      </div>
    </aside>
  );
}

function MobileStepper() {
  return (
    <div className="border-b border-border bg-white px-5 py-3.5 md:hidden">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] text-[#9aa9b8]">Step {ACTIVE_STEP} of {STEPS.length}</span>
        <span className="text-[12px] font-medium text-[#3a8b5e]">
          <i className="fas fa-cloud-upload-alt mr-1.5 text-[10px]" />
          Auto-saved
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="h-1.5 flex-1 rounded-pill"
            style={{
              background: s.n < ACTIVE_STEP ? "#3a8b5e" : s.n === ACTIVE_STEP ? "#EE344E" : "#E6E8EC",
            }}
          />
        ))}
      </div>
      <div className="mt-2.5 text-[14px] font-semibold text-heading">
        <i className={`fas ${STEPS[ACTIVE_STEP - 1]!.ic} mr-2 text-[11px] text-cta`} />
        {STEPS[ACTIVE_STEP - 1]!.label}
      </div>
    </div>
  );
}

function StepHeader() {
  const s = STEPS[ACTIVE_STEP - 1]!;
  return (
    <div className="border-b border-[#F4F5F7] px-5 pb-4 pt-6 md:px-8">
      <div className="mb-1.5 flex items-center gap-2 text-[12px] text-[#9aa9b8]">
        Step {ACTIVE_STEP} of {STEPS.length}
        <span className="text-[#cdd9e4]">·</span>
        <span className="font-medium text-cta">
          <i className={`fas ${s.ic} mr-1 text-[10px]`} />
          {s.label}
        </span>
      </div>
      <h2 className="text-[24px] font-semibold leading-[30px] text-heading md:text-[26px] md:leading-8">
        Make the website feel like Mahima
      </h2>
      <p className="mt-1 max-w-[560px] text-[14px] text-muted">
        Upload a logo, set the accent colour, and pick a subdomain. The preview on the right updates as you type.
      </p>
    </div>
  );
}

function FieldShell({ label, children, hint, error, ok }: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  ok?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-heading">{label}</label>
      <div
        className="flex items-center gap-0 rounded-md bg-white px-3 py-2.5"
        style={{ border: error ? "1.5px solid #EE344E" : ok ? "1.5px solid #3a8b5e" : "1px solid #E6E8EC" }}
      >
        {children}
      </div>
      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-cta">
          <i className="fas fa-exclamation-triangle text-[10px]" />
          {error}
        </div>
      )}
      {ok && hint && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#3a8b5e]">
          <i className="fas fa-check text-[10px]" /> {hint}
        </div>
      )}
      {hint && !ok && !error && (
        <div className="mt-1.5 text-[12px] text-[#9aa9b8]">{hint}</div>
      )}
    </div>
  );
}

function ColorSwatch({ hex, active }: { hex: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={hex}
      className="h-9 w-9 cursor-pointer rounded-pill"
      style={{
        background: hex,
        border: active ? "2.5px solid #fff" : "2px solid #fff",
        boxShadow: active ? `0 0 0 2.5px ${hex}` : "0 0 0 1px #E6E8EC",
      }}
    />
  );
}

function LivePreview() {
  const color = "#EE344E";
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-[0_8px_24px_-10px_rgba(16,24,40,0.10)]">
      <div className="flex items-center gap-2 border-b border-border bg-[#F4F5F7] px-3 py-2">
        <span className="flex gap-1.5">
          {["#EE344E", "#FFB620", "#3a8b5e"].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-pill opacity-80" style={{ background: c }} />
          ))}
        </span>
        <div className="flex flex-1 items-center gap-1.5 rounded-sm bg-white px-2.5 py-0.5 text-[10px] text-muted">
          <i className="fas fa-lock text-[8px] text-[#3a8b5e]" />
          mahima.rxbooq.com
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-b border-[#F4F5F7] px-3.5 py-2">
        <span
          className="grid h-[22px] w-[22px] place-items-center rounded-sm text-[10px] font-bold text-white"
          style={{ background: color }}
        >
          M
        </span>
        <span className="text-[11px] font-semibold text-heading">Mahima Dental</span>
        <div className="ml-1.5 flex gap-2">
          {["Home", "Services", "Doctors", "Contact"].map((l) => (
            <span key={l} className="text-[9px] text-muted">{l}</span>
          ))}
        </div>
        <span
          className="ml-auto rounded-sm px-2.5 py-1 text-[9px] font-semibold text-white"
          style={{ background: color }}
        >
          Book
        </span>
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-3 bg-surface-muted px-4 py-4">
        <div>
          <div className="text-[14px] font-semibold leading-[18px] text-heading">
            Modern dental care in Sundargarh
          </div>
          <div className="mt-1.5 text-[9px] leading-[13px] text-muted">
            Trusted by patients in Sundargarh and nearby. Modern equipment, painless treatment, online booking on
            WhatsApp.
          </div>
          <div className="mt-2.5 flex gap-1.5">
            <span
              className="rounded-sm px-2 py-1 text-[9px] font-semibold text-white"
              style={{ background: color }}
            >
              Book appointment
            </span>
            <span className="rounded-sm border border-link-hover bg-white px-2 py-1 text-[9px] font-semibold text-link-hover">
              Call now
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {["5.0★", "74 reviews", "MDS-qualified"].map((t) => (
              <span
                key={t}
                className="rounded-sm border border-border bg-white px-1.5 py-0.5 text-[8px] text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div
          className="grid place-items-center rounded-md font-mono text-[9px] text-[#9aa9b8]"
          style={{
            background:
              "repeating-linear-gradient(45deg, #ECEFF3, #ECEFF3 5px, #F4F5F7 5px, #F4F5F7 10px)",
          }}
        >
          doctor + patient
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 py-3.5">
        {[
          { ic: "fa-tooth", l: "Root Canal" },
          { ic: "fa-teeth", l: "Implants" },
          { ic: "fa-baby", l: "Pediatric" },
        ].map((s) => (
          <div key={s.l} className="rounded-sm border border-border bg-white p-2 text-[9px]">
            <i className={`fas ${s.ic} text-[11px]`} style={{ color }} />
            <div className="mt-1 font-semibold text-heading">{s.l}</div>
            <div className="mt-0.5 text-[8px]" style={{ color }}>Read more →</div>
          </div>
        ))}
      </div>

      <div className="mx-3.5 mb-3.5 flex items-center gap-2.5 rounded-md bg-brand px-3.5 py-2.5 text-white">
        <i className="fab fa-whatsapp text-[14px]" />
        <span className="flex-1 text-[10px]">Need to see a dentist today? Book in 30 seconds.</span>
        <span className="rounded-pill bg-white px-2.5 py-1 text-[9px] font-semibold text-brand">
          Book on WhatsApp
        </span>
      </div>
    </div>
  );
}

function Step2Body() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Left form */}
      <div className="flex flex-col gap-4.5 md:gap-[18px]">
        {/* Logo upload */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-heading">Clinic logo</label>
          <div className="flex items-center gap-3.5 rounded-[10px] border-2 border-dashed border-[#cdd9e4] bg-surface-muted p-4">
            <span className="grid h-16 w-16 flex-none place-items-center rounded-md border border-border bg-white text-[24px] font-bold text-cta">
              M
            </span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-heading">mahima-logo-final.svg</div>
              <div className="mt-0.5 text-[11px] text-muted">Replace · 24 KB · SVG, transparent</div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  className="rounded-sm border border-border bg-white px-2.5 py-1 text-[11px] text-heading"
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-border bg-white px-2.5 py-1 text-[11px] text-cta"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <FieldShell label="Tagline" hint="Shown under the headline on the home page. 60 chars max.">
          <span className="flex-1 truncate text-[14px] text-heading">Modern dental care in Sundargarh</span>
        </FieldShell>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-heading">Accent colour</label>
          <div className="flex flex-wrap items-center gap-3.5">
            {[
              { hex: "#EE344E", active: true },
              { hex: "#0168B3" },
              { hex: "#3a8b5e" },
              { hex: "#7a5c2b" },
              { hex: "#6b3aa1" },
            ].map((s) => <ColorSwatch key={s.hex} hex={s.hex} active={s.active} />)}
            <span className="text-[12px] text-[#9aa9b8]">or enter hex</span>
            <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2.5 py-1.5 font-mono text-[13px]">
              <span className="h-3.5 w-3.5 rounded-sm bg-cta" />
              #EE344E
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#9aa9b8]">
            Coral / brand-blue defaults stay for system buttons. Accent is used on hero, card icons and the WhatsApp pill.
          </div>
        </div>

        <FieldShell label="Subdomain" ok hint="Subdomain available ✓">
          <span className="mr-1.5 text-[14px] text-[#9aa9b8]">https://</span>
          <span className="flex-1 truncate text-[14px] text-heading">mahima</span>
          <span className="ml-1.5 text-[13px] text-[#9aa9b8]">.rxbooq.com</span>
          <i className="fas fa-check-circle ml-2 text-[14px] text-[#3a8b5e]" />
        </FieldShell>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-heading">Hero photo</label>
          <div
            className="flex h-32 items-center justify-center gap-2 rounded-md text-[12px] text-muted"
            style={{
              background:
                "repeating-linear-gradient(45deg, #ECEFF3, #ECEFF3 6px, #F4F5F7 6px, #F4F5F7 12px)",
            }}
          >
            <i className="fas fa-cloud-upload-alt text-[18px] text-[#9aa9b8]" />
            Drop a candid daylit photo — recommended 1600 × 1100 px
          </div>
        </div>
      </div>

      {/* Right preview (desktop only) */}
      <div className="hidden lg:block">
        <div className="mb-2.5 flex items-center gap-2 text-[12px] text-[#9aa9b8]">
          <span
            className="h-1.5 w-1.5 rounded-pill bg-[#3a8b5e]"
            style={{ boxShadow: "0 0 0 3px rgba(58,139,94,0.20)" }}
          />
          Live preview · updates as you type
        </div>
        <LivePreview />
      </div>

      {/* Mobile preview button */}
      <button
        type="button"
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-4 py-3 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white lg:hidden"
      >
        <i className="fas fa-eye" /> Open live preview
      </button>
    </div>
  );
}

function WizardBottomBar() {
  return (
    <div className="flex items-center gap-2.5 border-t border-border bg-white px-5 py-3.5 md:px-8">
      <button
        type="button"
        className="hidden cursor-pointer border-0 bg-transparent px-3.5 py-2 text-[13px] text-muted md:inline"
      >
        Cancel
      </button>
      <div className="flex-1" />
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-border bg-white px-4 py-2 text-[13px] font-medium text-heading"
      >
        <i className="fas fa-save" /> Save draft
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md bg-cta px-5 py-2.5 text-[14px] font-medium text-cta-fg hover:bg-[#d92843]"
      >
        Continue <i className="fas fa-arrow-right text-[11px]" />
      </button>
    </div>
  );
}

export function SuperAdminOnboardWizard() {
  return (
    <div className="flex min-h-0 flex-1">
      <ProgressRail />
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <MobileStepper />
        <StepHeader />
        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
          <Step2Body />
        </div>
        <WizardBottomBar />
      </div>
    </div>
  );
}
