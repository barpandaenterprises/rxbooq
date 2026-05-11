"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import {
  SPECIALTIES,
  WEEKDAYS,
  WEEKDAY_LABEL,
  type Doctor,
  type DoctorStatus,
  type Locale,
  type Specialty,
  type WeeklySchedule,
} from "@/lib/doctors-data";

type Props = {
  trigger: React.ReactNode;
  onAdded: (doctor: Doctor) => void;
};

const DEFAULT_RANGE = { start: "09:00", end: "18:00" };

const AVATAR_PALETTE = [
  { bg: "#FFE7EC", fg: "#EE344E" },
  { bg: "#E6F1FA", fg: "#0E5087" },
  { bg: "#E6F4EC", fg: "#3a8b5e" },
  { bg: "#FFF8EC", fg: "#7a5c2b" },
  { bg: "#F4E5FA", fg: "#6b3aa1" },
];

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => !p.match(/^dr\.?$/i));
  if (parts.length === 0) return "DR";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]!.charAt(0) ?? "") + (parts[parts.length - 1]!.charAt(0) ?? "")).toUpperCase();
}

function generateId(name: string, existing: string[]): string {
  const parts = name.trim().split(/\s+/).filter((p) => !p.match(/^dr\.?$/i));
  const base =
    parts.length >= 2
      ? ((parts[0]!.charAt(0) ?? "") + (parts[parts.length - 1]!.charAt(0) ?? "")).toLowerCase()
      : parts[0]?.slice(0, 2).toLowerCase() ?? "dr";
  let id = base;
  let n = 1;
  while (existing.includes(id)) {
    id = `${base}${n++}`;
  }
  return id;
}

export function AddDoctorDialog({ trigger, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [primarySpecialty, setPrimarySpecialty] = useState<Specialty>("General Dentistry");
  const [trainedAt, setTrainedAt] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [languages, setLanguages] = useState<Set<Locale>>(new Set(["EN"]));
  const [visiting, setVisiting] = useState(false);
  const [visitingNote, setVisitingNote] = useState("");
  const [status, setStatus] = useState<DoctorStatus>("active");
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    mon: [DEFAULT_RANGE], tue: [DEFAULT_RANGE], wed: [DEFAULT_RANGE],
    thu: [DEFAULT_RANGE], fri: [DEFAULT_RANGE], sat: [DEFAULT_RANGE],
  });

  const cleanedName = name.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  const canSubmit =
    cleanedName.length >= 2 &&
    qualifications.trim().length > 0 &&
    registrationNumber.trim().length > 0 &&
    phoneDigits.length === 10 &&
    languages.size > 0;

  const toggleLang = (l: Locale) => {
    setLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  };

  const toggleDay = (d: keyof WeeklySchedule) => {
    setSchedule((prev) => {
      const next = { ...prev };
      if (next[d]) delete next[d];
      else next[d] = [DEFAULT_RANGE];
      return next;
    });
  };

  const updateRange = (d: keyof WeeklySchedule, field: "start" | "end", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [d]: [{ ...(prev[d]?.[0] ?? DEFAULT_RANGE), [field]: value }],
    }));
  };

  const reset = () => {
    setName("");
    setQualifications("");
    setRegistrationNumber("");
    setPrimarySpecialty("General Dentistry");
    setTrainedAt("");
    setPhone("");
    setEmail("");
    setLanguages(new Set(["EN"]));
    setVisiting(false);
    setVisitingNote("");
    setStatus("active");
    setSchedule({
      mon: [DEFAULT_RANGE], tue: [DEFAULT_RANGE], wed: [DEFAULT_RANGE],
      thu: [DEFAULT_RANGE], fri: [DEFAULT_RANGE], sat: [DEFAULT_RANGE],
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const palette = AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)]!;
    const newDoctor: Doctor = {
      id: generateId(cleanedName, []),
      name: cleanedName.startsWith("Dr") ? cleanedName : `Dr. ${cleanedName}`,
      initials: generateInitials(cleanedName),
      avatarBg: palette.bg,
      avatarFg: palette.fg,
      qualifications: qualifications.split(",").map((q) => q.trim()).filter(Boolean),
      registrationNumber: registrationNumber.trim(),
      primarySpecialty,
      subSpecialties: [],
      trainedAt: trainedAt.trim() || "—",
      bio: "",
      languages: Array.from(languages),
      phone: `+91 ${phoneDigits}`,
      email: email.trim() || undefined,
      whatsappOptIn: true,
      status,
      visiting,
      visitingNote: visiting ? visitingNote.trim() || undefined : undefined,
      joinedOn: new Date().toISOString().slice(0, 10),
      schedule,
      services: ["gen"],
      stats: {
        yearsExperience: 0,
        patientsServed: 0,
        appointmentsCompleted: 0,
        avgRating: 0,
        reviewCount: 0,
      },
      reviews: [],
    };
    onAdded(newDoctor);
    setOpen(false);
    window.setTimeout(reset, 200);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) window.setTimeout(reset, 200); }}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">Add doctor</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                Onboard a new doctor to the team. They&rsquo;ll appear in the booking flow once active.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
            >
              <i className="fas fa-times text-[12px]" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6">
            <Section label="Basics" required>
              <Field label="Full name" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Manoranjan Mahakur"
                  autoFocus
                  className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                />
                <p className="mt-1 text-[11px] text-[#9aa9b8]">We'll add the &ldquo;Dr.&rdquo; prefix automatically if missing.</p>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Qualifications" required>
                  <input
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    placeholder="MDS, MPH"
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                  />
                  <p className="mt-1 text-[11px] text-[#9aa9b8]">Comma-separated</p>
                </Field>
                <Field label="Registration No." required>
                  <input
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="446/A"
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Primary specialty">
                  <select
                    value={primarySpecialty}
                    onChange={(e) => setPrimarySpecialty(e.target.value as Specialty)}
                    className="w-full cursor-pointer rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                  >
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Trained at">
                  <input
                    value={trainedAt}
                    onChange={(e) => setTrainedAt(e.target.value)}
                    placeholder="BCB Dental College, Cuttack"
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                  />
                </Field>
              </div>
            </Section>

            <Section label="Contact">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Phone" required>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[14px] text-heading">🇮🇳 +91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                    />
                  </div>
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dr.name@clinic.in"
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                  />
                </Field>
              </div>

              <Field label="Languages" required>
                <div className="flex flex-wrap gap-1.5">
                  {(["EN", "HI", "OR"] as Locale[]).map((l) => {
                    const active = languages.has(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => toggleLang(l)}
                        className={
                          "rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                          (active
                            ? "bg-brand text-white"
                            : "border border-border bg-white text-heading hover:border-link-hover")
                        }
                      >
                        {l === "EN" ? "English" : l === "HI" ? "हिंदी" : "ଓଡ଼ିଆ"}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Section>

            <Section label="Role">
              <Field label="Type">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVisiting(false)}
                    className={
                      "rounded-pill px-3 py-1.5 text-[12px] font-medium " +
                      (!visiting ? "bg-brand text-white" : "border border-border bg-white text-heading")
                    }
                  >
                    Everyday team
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisiting(true)}
                    className={
                      "rounded-pill px-3 py-1.5 text-[12px] font-medium " +
                      (visiting ? "bg-brand text-white" : "border border-border bg-white text-heading")
                    }
                  >
                    Visiting consultant
                  </button>
                </div>
              </Field>

              {visiting && (
                <Field label="Visiting note">
                  <input
                    value={visitingNote}
                    onChange={(e) => setVisitingNote(e.target.value)}
                    placeholder="Last Saturday each month · 9:00 AM – 2:00 PM"
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                  />
                </Field>
              )}

              <Field label="Status">
                <div className="flex flex-wrap gap-1.5">
                  {(["active", "on_leave", "inactive"] as DoctorStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={
                        "rounded-pill px-3 py-1.5 text-[12px] font-medium capitalize " +
                        (status === s ? "bg-brand text-white" : "border border-border bg-white text-heading")
                      }
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            <Section label="Weekly hours">
              <p className="-mt-1 mb-2 text-[11px] text-[#9aa9b8]">
                Tap a day to toggle. Set start &amp; end times for active days. Fine-tune later from the Schedule tab.
              </p>
              <div className="space-y-1.5">
                {WEEKDAYS.map((d) => {
                  const range = schedule[d]?.[0];
                  const active = Boolean(range);
                  return (
                    <div key={d} className="flex items-center gap-2 rounded-md border border-border bg-white p-2">
                      <button
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={
                          "w-14 cursor-pointer rounded-md px-2 py-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] " +
                          (active ? "bg-brand text-white" : "bg-surface-muted text-muted")
                        }
                      >
                        {WEEKDAY_LABEL[d]}
                      </button>
                      {active && range ? (
                        <>
                          <input
                            type="time"
                            value={range.start}
                            onChange={(e) => updateRange(d, "start", e.target.value)}
                            className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                          />
                          <span className="text-[12px] text-muted">to</span>
                          <input
                            type="time"
                            value={range.end}
                            onChange={(e) => updateRange(d, "end", e.target.value)}
                            className="rounded-sm border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                          />
                        </>
                      ) : (
                        <span className="text-[12px] italic text-[#9aa9b8]">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>

          <div className="flex items-center gap-2.5 border-t border-border bg-surface-muted px-5 py-3.5">
            <Dialog.Close className="cursor-pointer rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted">
              Cancel
            </Dialog.Close>
            <div className="ml-auto flex items-center gap-3">
              {!canSubmit && (
                <span className="hidden text-[12px] text-[#9aa9b8] sm:inline">
                  <i className="fas fa-info-circle mr-1" />
                  Fill required fields to enable
                </span>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={
                  "inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg transition-colors hover:bg-[#d92843] " +
                  (!canSubmit ? "cursor-not-allowed opacity-50 hover:bg-cta" : "")
                }
              >
                <i className="fas fa-user-md text-[12px]" />
                Add doctor
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-heading">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </label>
      {children}
    </div>
  );
}
