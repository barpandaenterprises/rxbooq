"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import {
  BOOKING_DOCTORS,
  BOOKING_SERVICES,
  formatLongDate,
  formatSlotLabel,
  toLocalIso,
} from "@/lib/booking-data";

type RecentPatient = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  lang: "EN" | "HI" | "OR";
  bg: string;
  fg: string;
};

const RECENT_PATIENTS: RecentPatient[] = [
  { id: "P-1284", name: "Anita Sahu",      initials: "AS", phone: "98765 12342", lang: "EN", bg: "#FFE7EC", fg: "#EE344E" },
  { id: "P-1283", name: "Bidyut Panda",    initials: "BP", phone: "96543 22018", lang: "OR", bg: "#E6F1FA", fg: "#0E5087" },
  { id: "P-1278", name: "Manoj Behera",    initials: "MB", phone: "95672 34111", lang: "OR", bg: "#E6F4EC", fg: "#3a8b5e" },
  { id: "P-1273", name: "Karthik Rao",     initials: "KR", phone: "70084 91144", lang: "EN", bg: "#FFE7EC", fg: "#EE344E" },
  { id: "P-1271", name: "Pinky Sahu",      initials: "PS", phone: "87224 55501", lang: "OR", bg: "#E6F1FA", fg: "#0E5087" },
  { id: "P-1262", name: "Laxmi Pradhan",   initials: "LP", phone: "90324 55512", lang: "HI", bg: "#F4E5FA", fg: "#6b3aa1" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const BOOKED_SLOTS = new Set(["10:30", "11:00", "13:00", "13:30", "15:30"]);
const LUNCH_SLOTS = new Set(["14:00", "14:30"]);

type DemoDate = { iso: string; day: number; month: string; weekday: string; closed: boolean; isToday: boolean };

function buildDates(count: number): DemoDate[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }).map((_, i): DemoDate => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dow = d.getDay();
    return {
      iso: toLocalIso(d),
      day: d.getDate(),
      month: MONTH_LABELS[d.getMonth()]!,
      weekday: DAY_LABELS[dow]!,
      closed: dow === 0,
      isToday: i === 0,
    };
  });
}

function buildSlots() {
  const out: { short: string; label: string }[] = [];
  for (let h = 9; h < 19; h++) {
    for (const m of [0, 30]) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h > 12 ? h - 12 : h;
      out.push({
        short: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`,
        label: `${hour12}:${m === 0 ? "00" : "30"} ${ampm}`,
      });
    }
  }
  return out;
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

type Props = {
  trigger: React.ReactNode;
};

export function NewAppointmentDialog({ trigger }: Props) {
  const dates = useMemo(() => buildDates(7), []);
  const slots = useMemo(buildSlots, []);
  const firstOpenIso = dates.find((d) => !d.closed)?.iso ?? dates[0]!.iso;

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<RecentPatient | null>(null);
  const [serviceId, setServiceId] = useState(BOOKING_SERVICES[0]!.id);
  const [doctorId, setDoctorId] = useState(BOOKING_DOCTORS[0]!.id);
  const [dateIso, setDateIso] = useState(firstOpenIso);
  const [slot, setSlot] = useState<string | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const phoneDigits = digitsOnly(phone);
  const matches = useMemo(() => {
    if (phoneDigits.length < 2) return [];
    return RECENT_PATIENTS.filter((p) =>
      digitsOnly(p.phone).includes(phoneDigits),
    );
  }, [phoneDigits]);

  const isExistingPatient = selected !== null;
  const isNewPatientReady = !isExistingPatient && phoneDigits.length === 10 && name.trim().length >= 2;
  const patientReady = isExistingPatient || isNewPatientReady;
  const canSubmit = patientReady && Boolean(slot);

  const reset = () => {
    setPhone("");
    setName("");
    setSelected(null);
    setServiceId(BOOKING_SERVICES[0]!.id);
    setDoctorId(BOOKING_DOCTORS[0]!.id);
    setDateIso(firstOpenIso);
    setSlot(null);
    setSendWhatsApp(true);
    setNotes("");
    setConfirmed(false);
  };

  const handleSelectPatient = (p: RecentPatient) => {
    setSelected(p);
    setPhone(p.phone);
    setName(p.name);
  };

  const handleClearPatient = () => {
    setSelected(null);
    setPhone("");
    setName("");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    // Production: write booking + trigger Interakt template.
    setConfirmed(true);
  };

  const service = BOOKING_SERVICES.find((s) => s.id === serviceId)!;
  const doctor = BOOKING_DOCTORS.find((d) => d.id === doctorId)!;
  const patientName = selected ? selected.name : name.trim() || "this patient";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          // Defer reset so the closing animation isn't jarring.
          window.setTimeout(reset, 200);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          {confirmed ? (
            <ConfirmedView
              patientName={patientName}
              dateIso={dateIso}
              slotShort={slot!}
              serviceName={service.name}
              doctorName={doctor.name}
              sendWhatsApp={sendWhatsApp}
              onClose={() => setOpen(false)}
              onAnother={() => {
                setConfirmed(false);
                setSlot(null);
                setNotes("");
              }}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
                <div>
                  <Dialog.Title className="text-[18px] font-semibold text-heading">
                    New appointment
                  </Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                    Booking on behalf of a patient who called or walked in.
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
                >
                  <i className="fas fa-times text-[12px]" />
                </Dialog.Close>
              </div>

              {/* Body — single scrollable column so the form fits any height */}
              <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6">
                {/* Patient */}
                <Section label="Patient" required>
                  {isExistingPatient ? (
                    <div className="flex items-center gap-3 rounded-md border border-[#3a8b5e] bg-[#E6F4EC] px-3 py-2.5">
                      <span
                        className="grid h-9 w-9 flex-none place-items-center rounded-pill text-[12px] font-semibold"
                        style={{ background: selected!.bg, color: selected!.fg }}
                      >
                        {selected!.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-heading">{selected!.name}</div>
                        <div className="text-[12px] text-muted">+91 {selected!.phone} · {selected!.lang}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearPatient}
                        className="rounded-md border border-border bg-white px-2.5 py-1 text-[12px] text-muted hover:text-heading"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[14px] text-heading">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoFocus
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Type or paste caller number"
                          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                        />
                      </div>

                      {/* Quick-select chips for recent patients */}
                      {phoneDigits.length < 2 && (
                        <>
                          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                            Recent callers
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {RECENT_PATIENTS.slice(0, 4).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectPatient(p)}
                                className="inline-flex items-center gap-2 rounded-pill border border-border bg-white px-2 py-1 text-[12px] text-heading hover:border-link-hover"
                              >
                                <span
                                  className="grid h-6 w-6 flex-none place-items-center rounded-pill text-[10px] font-semibold"
                                  style={{ background: p.bg, color: p.fg }}
                                >
                                  {p.initials}
                                </span>
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Live matches */}
                      {matches.length > 0 && (
                        <div className="mt-2 overflow-hidden rounded-md border border-border bg-white">
                          {matches.map((p, i) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPatient(p)}
                              className={
                                "flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-muted " +
                                (i < matches.length - 1 ? "border-b border-border" : "")
                              }
                            >
                              <span
                                className="grid h-9 w-9 flex-none place-items-center rounded-pill text-[12px] font-semibold"
                                style={{ background: p.bg, color: p.fg }}
                              >
                                {p.initials}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[14px] font-semibold text-heading">{p.name}</div>
                                <div className="font-mono text-[11px] text-[#9aa9b8]">{p.id} · +91 {p.phone}</div>
                              </div>
                              <i className="fas fa-arrow-right text-[10px] text-muted" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* No match — inline create */}
                      {phoneDigits.length >= 2 && matches.length === 0 && (
                        <div className="mt-2 rounded-md border border-dashed border-[#cdd9e4] bg-surface-muted p-3">
                          <div className="text-[12px] text-muted">
                            <i className="fas fa-user-plus mr-1.5 text-link-hover" />
                            No match. Create new patient:
                          </div>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Patient name (as on records)"
                            className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-[14px] text-heading outline-none focus:border-link-hover"
                          />
                          {phoneDigits.length > 0 && phoneDigits.length < 10 && (
                            <div className="mt-1.5 text-[11px] text-cta">
                              <i className="fas fa-exclamation-circle mr-1" />
                              Enter all 10 digits ({phoneDigits.length} so far).
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Section>

                {/* Service & Doctor — inline row */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Section label="Service" required>
                    <select
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                    >
                      {BOOKING_SERVICES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.duration} · {s.fee}
                        </option>
                      ))}
                    </select>
                  </Section>
                  <Section label="Doctor">
                    <select
                      value={doctorId}
                      onChange={(e) => setDoctorId(e.target.value)}
                      className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover"
                    >
                      {BOOKING_DOCTORS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} — {d.credential}
                        </option>
                      ))}
                    </select>
                  </Section>
                </div>

                {/* Date strip */}
                <Section label="When" required>
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {dates.map((d) => {
                      const sel = d.iso === dateIso;
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          disabled={d.closed}
                          onClick={() => {
                            setDateIso(d.iso);
                            setSlot(null);
                          }}
                          className={
                            "relative flex w-[60px] flex-none flex-col items-center rounded-md border-[1.5px] py-1.5 transition-colors " +
                            (d.closed
                              ? "cursor-not-allowed border-border bg-white text-[#cdd9e4] line-through"
                              : sel
                                ? "border-cta bg-cta text-white"
                                : "border-border bg-white text-heading hover:border-link-hover")
                          }
                        >
                          <span className="text-[10px] font-medium uppercase tracking-[0.06em]">{d.weekday}</span>
                          <span className="text-[18px] font-semibold leading-5">{d.day}</span>
                          <span className="text-[9px] opacity-70">{d.month}</span>
                          {d.isToday && !sel && (
                            <span className="absolute -right-1 -top-1.5 rounded-pill bg-brand px-1 py-px text-[8px] font-semibold text-white">
                              TODAY
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Slot grid */}
                  <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                    {slots.map((s) => {
                      const isLunch = LUNCH_SLOTS.has(s.short);
                      const isBooked = BOOKED_SLOTS.has(s.short);
                      const isSel = s.short === slot;
                      if (isLunch) {
                        return (
                          <span
                            key={s.short}
                            className="grid place-items-center rounded-md border border-dashed border-border bg-surface-muted py-1.5 text-[10px] text-[#9aa9b8]"
                          >
                            <i className="fas fa-utensils mr-0.5" /> Lunch
                          </span>
                        );
                      }
                      return (
                        <button
                          key={s.short}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSlot(s.short)}
                          className={
                            "rounded-md border-[1.5px] py-1.5 text-[12px] font-medium transition-colors " +
                            (isBooked
                              ? "cursor-not-allowed border-border bg-[#F4F5F7] text-[#9aa9b8] line-through"
                              : isSel
                                ? "border-cta bg-cta text-white shadow-sm"
                                : "border-border bg-white text-heading hover:border-link-hover")
                          }
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {/* Notification toggle */}
                <Section label="Notify patient">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-white p-3">
                    <input
                      type="checkbox"
                      checked={sendWhatsApp}
                      onChange={(e) => setSendWhatsApp(e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#25D366]"
                    />
                    <span className="text-[13px] leading-5 text-heading">
                      <strong className="font-semibold">Send WhatsApp confirmation</strong>{" "}
                      <span className="text-muted">
                        — booking_confirmation_v1 template, with the slot, doctor and clinic
                        address. Reply YES to lock it in.
                      </span>
                    </span>
                  </label>
                </Section>

                {/* Notes */}
                <Section label="Note for the doctor (optional)">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Patient is anxious about RCT — handle gently."
                    className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading outline-none focus:border-link-hover"
                  />
                </Section>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2.5 border-t border-border bg-surface-muted px-5 py-3.5">
                <Dialog.Close
                  className="cursor-pointer rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted"
                >
                  Cancel
                </Dialog.Close>
                <div className="ml-auto flex items-center gap-3">
                  {!patientReady && (
                    <span className="hidden text-[12px] text-[#9aa9b8] sm:inline">
                      <i className="fas fa-info-circle mr-1" />
                      Pick or create a patient first
                    </span>
                  )}
                  {patientReady && !slot && (
                    <span className="hidden text-[12px] text-[#9aa9b8] sm:inline">
                      <i className="fas fa-info-circle mr-1" />
                      Pick a time slot
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
                    <i className="fas fa-calendar-check text-[12px]" />
                    Confirm booking
                  </button>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </div>
      {children}
    </div>
  );
}

function ConfirmedView({
  patientName,
  dateIso,
  slotShort,
  serviceName,
  doctorName,
  sendWhatsApp,
  onClose,
  onAnother,
}: {
  patientName: string;
  dateIso: string;
  slotShort: string;
  serviceName: string;
  doctorName: string;
  sendWhatsApp: boolean;
  onClose: () => void;
  onAnother: () => void;
}) {
  return (
    <div className="px-6 py-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-[#E6F4EC] text-[26px] text-[#3a8b5e]">
        <i className="fas fa-check-circle" />
      </div>
      <h3 className="mt-3 text-[20px] font-semibold text-heading">Booking confirmed</h3>
      <p className="mt-1.5 text-[14px] leading-[20px] text-muted">
        <strong className="text-heading">{patientName}</strong> is booked for{" "}
        <strong className="text-heading">{serviceName}</strong> with{" "}
        <strong className="text-heading">{doctorName}</strong> on{" "}
        <strong className="text-heading">{formatLongDate(dateIso)} · {formatSlotLabel(slotShort)}</strong>.
      </p>
      <div className="mt-3 inline-flex items-center gap-2 rounded-pill bg-surface-muted px-3 py-1 text-[12px] text-muted">
        {sendWhatsApp ? (
          <>
            <i className="fab fa-whatsapp text-[#25D366]" />
            WhatsApp template queued — patient will see it shortly.
          </>
        ) : (
          <>
            <i className="fas fa-bell-slash" />
            No automated message sent (per your toggle).
          </>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-2.5">
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-4 py-2 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
        >
          <i className="fas fa-plus text-[11px]" /> Book another
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
