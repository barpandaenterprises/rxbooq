"use client";

import { useMemo, useState } from "react";

type ThreadStatus = "delivered" | "read" | "replied" | "failed" | "optout";
type ThreadFilter = "All" | "Unread" | "Failed" | "Replied";

type Bubble =
  | { kind: "out"; tpl: string; status: ThreadStatus; ts: string; body: string; failed?: boolean }
  | { kind: "in"; ts: string; body: string };

type Thread = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  phone: string;
  lastTpl: string;
  status: ThreadStatus;
  ts: string;
  preview: string;
  unread?: boolean;
  failed?: boolean;
  optout?: boolean;
  bubbles: Bubble[];
  context?: { service: string; date: string; doctor: string; bookingId: string };
};

const THREADS: Thread[] = [
  {
    id: "t1",
    name: "Bidyut Panda",
    initials: "BP",
    avatarBg: "#E6F1FA",
    avatarFg: "#0E5087",
    phone: "+91 96••• ••018",
    lastTpl: "booking_confirmation_v1",
    status: "replied",
    ts: "just now",
    preview: "Yes please confirm",
    unread: true,
    context: {
      service: "Tooth extraction · 9 May 2026, 3:30 PM",
      date: "9 May 2026",
      doctor: "Dr. Manoranjan Mahakur · 30 min",
      bookingId: "DK-3942",
    },
    bubbles: [
      { kind: "out", tpl: "booking_confirmation_v1", status: "read", ts: "3:31 PM",
        body: `Hi Bidyut, your appointment at Mahakur Poly Dental is booked.\nTooth extraction · 9 May 2026, 3:30 PM with Dr. Manoranjan Mahakur.\n\nPlease reply YES to confirm or RESCHEDULE.` },
      { kind: "in",  ts: "3:32 PM", body: "YES" },
      { kind: "out", tpl: "reminder_24h_v2", status: "read", ts: "2:30 PM",
        body: `Reminder: your appointment is in 1 hour at Mahakur Poly Dental, Bhatra Chowk.\nReply 1 to confirm, 2 to reschedule.` },
      { kind: "in", ts: "2:33 PM", body: "Yes please confirm" },
      { kind: "out", tpl: "customer_care_reply", status: "failed", ts: "3:01 PM", failed: true,
        body: "Thanks Bidyut! See you at 3:30 PM. Please arrive 5 min early." },
    ],
  },
  {
    id: "t2",
    name: "Anita Sahu",
    initials: "AS",
    avatarBg: "#FFE7EC",
    avatarFg: "#EE344E",
    phone: "+91 98••• ••342",
    lastTpl: "reminder_24h_v2",
    status: "read",
    ts: "2m",
    preview: "See you tomorrow at 5:30 PM",
    bubbles: [
      { kind: "out", tpl: "reminder_24h_v2", status: "read", ts: "Yesterday 5:30 PM",
        body: "Reminder: your Root Canal · S2 visit with Dr. Manoranjan is tomorrow at 5:30 PM. Reply 1 to confirm." },
      { kind: "in", ts: "Yesterday 5:32 PM", body: "1" },
      { kind: "in", ts: "2 min ago", body: "See you tomorrow at 5:30 PM" },
    ],
  },
  {
    id: "t3",
    name: "Sarita Mahanti",
    initials: "SM",
    avatarBg: "#FFF8EC",
    avatarFg: "#7a5c2b",
    phone: "+91 99••• ••445",
    lastTpl: "noshow_followup_v1",
    status: "failed",
    ts: "14m",
    preview: "undelivered · phone unreachable",
    failed: true,
    bubbles: [
      { kind: "out", tpl: "noshow_followup_v1", status: "failed", ts: "14 min ago", failed: true,
        body: "Hi Sarita, we missed you at your Whitening appointment today. Reply 2 to reschedule." },
    ],
  },
  {
    id: "t4",
    name: "Karthik Rao",
    initials: "KR",
    avatarBg: "#FFE7EC",
    avatarFg: "#EE344E",
    phone: "+91 70••• ••144",
    lastTpl: "booking_confirmation_v1",
    status: "read",
    ts: "18m",
    preview: "Got it, thanks",
    bubbles: [
      { kind: "out", tpl: "booking_confirmation_v1", status: "read", ts: "20 min ago", body: "Hi Karthik, your Cleaning appointment is booked for 10 May, 9:00 AM with Dr. Lipsa." },
      { kind: "in", ts: "18 min ago", body: "Got it, thanks" },
    ],
  },
  {
    id: "t5",
    name: "Pinky Sahu",
    initials: "PS",
    avatarBg: "#E6F1FA",
    avatarFg: "#0E5087",
    phone: "+91 87••• ••501",
    lastTpl: "booking_confirmation_v1",
    status: "read",
    ts: "22m",
    preview: "OK",
    bubbles: [
      { kind: "out", tpl: "booking_confirmation_v1", status: "read", ts: "23 min ago", body: "Hi Pinky, your Pediatric checkup is booked for 12 May, 10:30 AM." },
      { kind: "in", ts: "22 min ago", body: "OK" },
    ],
  },
  {
    id: "t6",
    name: "Suresh Pati",
    initials: "SP",
    avatarBg: "#E6F4EC",
    avatarFg: "#3a8b5e",
    phone: "+91 89••• ••445",
    lastTpl: "reminder_24h_v2",
    status: "replied",
    ts: "31m",
    preview: "Can we move to 4 PM?",
    bubbles: [
      { kind: "out", tpl: "reminder_24h_v2", status: "read", ts: "33 min ago", body: "Reminder: your Braces fitting tomorrow at 11:00 AM. Reply 2 to reschedule." },
      { kind: "in", ts: "31 min ago", body: "Can we move to 4 PM?" },
    ],
  },
  {
    id: "t7",
    name: "Manoj Behera",
    initials: "MB",
    avatarBg: "#E6F4EC",
    avatarFg: "#3a8b5e",
    phone: "+91 95••• ••111",
    lastTpl: "reminder_24h_v2",
    status: "delivered",
    ts: "46m",
    preview: "—",
    bubbles: [
      { kind: "out", tpl: "reminder_24h_v2", status: "delivered", ts: "46 min ago", body: "Reminder: implant consult tomorrow at 12:00 PM with Dr. Manoranjan." },
    ],
  },
  {
    id: "t8",
    name: "Laxmi Pradhan",
    initials: "LP",
    avatarBg: "#F4E5FA",
    avatarFg: "#6b3aa1",
    phone: "+91 90••• ••512",
    lastTpl: "cancellation_ack_v1",
    status: "read",
    ts: "1h",
    preview: "Thanks for confirming.",
    bubbles: [
      { kind: "out", tpl: "cancellation_ack_v1", status: "read", ts: "1 hr ago", body: "Your Cleaning appointment on 9 May has been cancelled." },
      { kind: "in", ts: "58 min ago", body: "Thanks for confirming." },
    ],
  },
  {
    id: "t9",
    name: "Rajesh Mishra",
    initials: "RM",
    avatarBg: "#F4F5F7",
    avatarFg: "#9aa9b8",
    phone: "+91 94••• ••111",
    lastTpl: "reminder_24h_v2",
    status: "optout",
    ts: "2d",
    preview: "STOP",
    optout: true,
    bubbles: [
      { kind: "out", tpl: "reminder_24h_v2", status: "delivered", ts: "2 days ago", body: "Reminder: your Consultation tomorrow." },
      { kind: "in", ts: "2 days ago", body: "STOP" },
    ],
  },
];

const TEMPLATES = [
  { id: "customer_care_reply",      label: "customer_care_reply",      preview: "Thanks {{name}}! See you at {{time}}." },
  { id: "booking_confirmation_v1",  label: "booking_confirmation_v1",  preview: "Hi {{name}}, your {{service}} on {{date}} is booked." },
  { id: "reminder_24h_v2",          label: "reminder_24h_v2",          preview: "Reminder: appointment at {{time}}. Reply 1 to confirm." },
  { id: "noshow_followup_v1",       label: "noshow_followup_v1",       preview: "We missed you. Reply 2 to reschedule." },
];

const STATUS_INFO: Record<ThreadStatus, { label: string; iconClass: string; iconColor: string; fg: string; bg: string }> = {
  delivered: { label: "Delivered", iconClass: "fas fa-check-double",       iconColor: "#9aa9b8", fg: "#575757", bg: "#F4F5F7" },
  read:      { label: "Read",      iconClass: "fas fa-check-double",       iconColor: "#34B7F1", fg: "#0E5087", bg: "#E6F1FA" },
  replied:   { label: "Replied",   iconClass: "fas fa-reply",              iconColor: "#3a8b5e", fg: "#3a8b5e", bg: "#E6F4EC" },
  failed:    { label: "Failed",    iconClass: "fas fa-exclamation-circle", iconColor: "#EE344E", fg: "#EE344E", bg: "#FFE7EC" },
  optout:    { label: "Opt-out",   iconClass: "fas fa-ban",                iconColor: "#9aa9b8", fg: "#575757", bg: "#F4F5F7" },
};

function StatusPill({ s }: { s: ThreadStatus }) {
  const i = STATUS_INFO[s];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: i.bg, color: i.fg }}
    >
      <i className={`${i.iconClass} text-[9px]`} style={{ color: i.iconColor }} />
      {i.label}
    </span>
  );
}

function ThreadRow({ t, active, onClick }: { t: Thread; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative flex w-full items-start gap-3 border-b border-[#F4F5F7] p-4 text-left transition-colors hover:bg-[#FAFBFC] " +
        (active ? "bg-[#F9FBFD]" : "bg-white")
      }
      style={active ? { boxShadow: "inset 3px 0 0 #0168B3" } : undefined}
    >
      <span
        className="relative grid h-10 w-10 flex-none place-items-center rounded-pill text-[13px] font-semibold"
        style={{ background: t.avatarBg, color: t.avatarFg }}
      >
        {t.initials}
        {t.unread && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-pill border-2 border-white bg-cta" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={"text-[14px] text-heading " + (t.unread ? "font-semibold" : "font-medium")}>
            {t.name}
          </span>
          <span
            className={"text-[11px] " + (t.unread ? "font-semibold text-cta" : "font-normal text-[#9aa9b8]")}
          >
            {t.ts}
          </span>
        </div>
        <div className="mb-1 mt-0.5 flex items-center gap-1.5">
          <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {t.lastTpl}
          </code>
          {t.optout && (
            <span className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.04em] text-muted">
              OPTED OUT
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={
              "flex-1 truncate text-[12px] " + (t.failed ? "text-cta" : "text-muted")
            }
          >
            {t.preview}
          </span>
          <StatusPill s={t.status} />
        </div>
      </div>
    </button>
  );
}

function InboundBubble({ children, ts }: { children: React.ReactNode; ts: string }) {
  return (
    <div className="mb-3.5 flex justify-start">
      <div className="max-w-[380px] rounded-[12px] rounded-bl-[4px] border border-border bg-white px-3.5 py-2.5">
        <div className="whitespace-pre-line text-[14px] leading-5 text-heading">{children}</div>
        <div className="mt-1 text-right text-[10px] text-[#9aa9b8]">{ts}</div>
      </div>
    </div>
  );
}

function OutboundBubble({
  tpl,
  status,
  children,
  ts,
  failed,
}: {
  tpl: string;
  status?: ThreadStatus;
  children: React.ReactNode;
  ts: string;
  failed?: boolean;
}) {
  return (
    <div className="mb-3.5 flex justify-end">
      <div className="max-w-[440px]">
        <div className="mb-1 flex items-center justify-end gap-1.5">
          <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[10px] text-muted">{tpl}</code>
        </div>
        <div
          className={
            "rounded-[12px] rounded-br-[4px] px-4 py-3 " +
            (failed ? "border-[1.5px] border-cta bg-white text-heading" : "bg-brand text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)]")
          }
        >
          <div className="whitespace-pre-line text-[14px] leading-[21px]">{children}</div>
        </div>
        {failed && (
          <div className="mt-1.5 flex items-center gap-2.5 rounded-md bg-[#FFE7EC] px-3 py-2">
            <i className="fas fa-exclamation-circle text-[13px] text-cta" />
            <div className="flex-1 text-[12px] text-cta">
              <strong>Delivery failed.</strong> 24-hour customer-care window expired. Resend with a template.
            </div>
            <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-cta px-3 py-1.5 text-[12px] font-medium text-cta-fg">
              <i className="fas fa-redo" /> Retry
            </button>
          </div>
        )}
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="text-[10px] text-[#9aa9b8]">{ts}</span>
          {!failed && status && <StatusPill s={status} />}
        </div>
      </div>
    </div>
  );
}

function ContextCard({ thread }: { thread: Thread }) {
  if (!thread.context) return null;
  return (
    <div className="mx-5 mt-3.5 flex items-center gap-3.5 rounded-md border border-border bg-white px-4 py-3">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-[#FFE7EC] text-[14px] text-cta">
        <i className="fas fa-tooth" />
      </span>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-heading">{thread.context.service}</div>
        <div className="mt-0.5 text-[12px] text-muted">
          {thread.context.doctor} · Booking #{thread.context.bookingId}
        </div>
      </div>
      <a
        href="#"
        className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-link-hover px-3.5 py-1.5 text-[13px] font-medium text-link-hover no-underline"
      >
        Open patient <i className="fas fa-arrow-right text-[11px]" />
      </a>
    </div>
  );
}

export function AdminMessages() {
  const [activeId, setActiveId] = useState<string>(THREADS[0]!.id);
  const [filter, setFilter] = useState<ThreadFilter>("All");
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("");
  const [templateId, setTemplateId] = useState("customer_care_reply");
  const [templateOpen, setTemplateOpen] = useState(false);

  const counts = useMemo(() => ({
    All:     THREADS.length,
    Unread:  THREADS.filter((t) => t.unread).length,
    Failed:  THREADS.filter((t) => t.failed).length,
    Replied: THREADS.filter((t) => t.status === "replied").length,
  }), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return THREADS.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.preview.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "Unread":  return Boolean(t.unread);
        case "Failed":  return Boolean(t.failed);
        case "Replied": return t.status === "replied";
        case "All":     return true;
      }
    });
  }, [filter, search]);

  const active = THREADS.find((t) => t.id === activeId) ?? THREADS[0]!;
  const template = TEMPLATES.find((tpl) => tpl.id === templateId) ?? TEMPLATES[0]!;
  const canSend = composer.trim().length > 0 && !active.optout;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-border bg-white px-5 pb-4 pt-6 md:px-8">
        <div className="flex flex-wrap items-center gap-3.5">
          <h2 className="text-[26px] font-semibold leading-[34px] text-heading md:text-[28px]">
            WhatsApp messages
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#E6F4EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#3a8b5e]">
            <span
              className="h-1.5 w-1.5 rounded-pill bg-[#3a8b5e]"
              style={{ boxShadow: "0 0 0 3px rgba(58,139,94,0.20)" }}
            />
            Interakt webhook · healthy
          </span>
          <span className="text-[12px] text-[#9aa9b8]">
            · {THREADS.length} conversations · {counts.Unread} unread
          </span>
          <div className="ml-auto flex gap-2.5">
            <button
              type="button"
              className="hidden items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-3.5 py-2 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white md:inline-flex"
            >
              <i className="fas fa-cog" /> Templates
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-medium text-cta-fg hover:bg-[#d92843]"
            >
              <i className="fas fa-paper-plane" /> Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[380px_1fr]">
        {/* Thread list */}
        <div className="hidden min-h-0 flex-col border-r border-border bg-white md:flex">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface-muted px-3 py-2.5 focus-within:border-link-hover">
              <i className="fas fa-search text-[13px] text-[#9aa9b8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages or patients…"
                className="w-full bg-transparent text-[13px] text-heading outline-none placeholder:text-[#9aa9b8]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="text-[12px] text-muted"
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(Object.keys(counts) as ThreadFilter[]).map((f) => {
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-3 py-1 text-[12px] font-medium " +
                      (isActive ? "bg-brand text-white" : "border border-border bg-white text-heading hover:border-link-hover")
                    }
                  >
                    {f}
                    <span
                      className={"text-[10px] font-semibold " + (isActive ? "text-white/80" : "text-[#9aa9b8]")}
                    >
                      {counts[f]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.map((t) => (
              <ThreadRow
                key={t.id}
                t={t}
                active={t.id === activeId}
                onClick={() => {
                  setActiveId(t.id);
                  setComposer("");
                }}
              />
            ))}
            {filtered.length === 0 && (
              <div className="grid place-items-center px-4 py-12 text-center text-[13px] text-muted">
                <i className="fas fa-inbox text-[24px] text-[#cdd9e4]" />
                <span className="mt-2">No conversations match.</span>
              </div>
            )}
          </div>
        </div>

        {/* Conversation pane */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F9FBFD]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(1,104,179,0.05) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        >
          <header className="flex items-center gap-3 border-b border-border bg-white px-5 py-3.5">
            <span
              className="grid h-10 w-10 place-items-center rounded-pill text-[13px] font-semibold"
              style={{ background: active.avatarBg, color: active.avatarFg }}
            >
              {active.initials}
            </span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-heading">{active.name}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#3a8b5e]">
                {active.optout ? (
                  <span className="text-muted">
                    <i className="fas fa-ban mr-1" />
                    Opted out · {active.phone}
                  </span>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-pill bg-[#3a8b5e]" />
                    Online · {active.phone}
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Call"
              className="grid h-9 w-9 place-items-center rounded-pill border border-border bg-white text-muted hover:text-link-hover"
            >
              <i className="fas fa-phone text-[13px]" />
            </button>
            <button
              type="button"
              aria-label="More"
              className="grid h-9 w-9 place-items-center rounded-pill border border-border bg-white text-muted hover:text-link-hover"
            >
              <i className="fas fa-ellipsis-v text-[13px]" />
            </button>
          </header>

          <ContextCard thread={active} />

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-4 mt-1 text-center">
              <span className="rounded-pill bg-white/70 px-3 py-0.5 text-[11px] text-[#9aa9b8]">
                Today · 9 May 2026
              </span>
            </div>
            {active.bubbles.map((b, i) =>
              b.kind === "in" ? (
                <InboundBubble key={i} ts={b.ts}>{b.body}</InboundBubble>
              ) : (
                <OutboundBubble key={i} tpl={b.tpl} status={b.status} ts={b.ts} failed={b.failed}>
                  {b.body}
                </OutboundBubble>
              ),
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-white px-5 py-4">
            <div className="mb-2.5 flex items-center gap-2.5 text-[11px] text-[#9aa9b8]">
              <i className="fas fa-info-circle text-[12px]" />
              {active.optout
                ? "Patient opted out. Composer disabled."
                : "Outside the 24-hour window — only approved templates can be sent."}
            </div>
            <div className="flex flex-wrap items-stretch gap-2">
              {/* Template picker (Popover-equivalent built inline so we don't add another import) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplateOpen((v) => !v)}
                  className="inline-flex min-w-[240px] items-center justify-between gap-2 rounded-md border border-border bg-white px-3.5 py-2.5 text-[13px] text-heading hover:border-link-hover"
                >
                  <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    {template.label}
                  </code>
                  <i className="fas fa-chevron-down text-[10px] text-[#9aa9b8]" />
                </button>
                {templateOpen && (
                  <div className="absolute bottom-full left-0 z-10 mb-1.5 w-[300px] rounded-md border border-border bg-white p-1.5 shadow-md">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setTemplateId(tpl.id);
                          setComposer(tpl.preview);
                          setTemplateOpen(false);
                        }}
                        className={
                          "flex w-full cursor-pointer flex-col gap-0.5 rounded-sm px-2.5 py-2 text-left hover:bg-surface-muted " +
                          (templateId === tpl.id ? "bg-[#E6F1FA]" : "")
                        }
                      >
                        <code className="font-mono text-[11px] text-muted">{tpl.label}</code>
                        <span className="text-[12px] text-heading">{tpl.preview}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                disabled={active.optout}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) {
                      // Demo: clear the composer, would post to Interakt in production.
                      setComposer("");
                    }
                  }
                }}
                placeholder={active.optout ? "Patient is opted out" : "Type a reply, or pick a template…"}
                rows={1}
                className="min-h-[44px] flex-1 resize-y rounded-md border border-border bg-surface-muted px-3.5 py-2.5 text-[14px] text-heading outline-none placeholder:text-[#9aa9b8] focus:border-link-hover disabled:opacity-50"
              />

              <button
                type="button"
                disabled={active.optout}
                className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-3.5 py-2 text-[13px] font-medium text-link-hover hover:bg-link-hover hover:text-white disabled:opacity-50"
              >
                <i className="fas fa-eye" /> Preview
              </button>
              <button
                type="button"
                disabled={!canSend}
                onClick={() => setComposer("")}
                className={
                  "inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg transition-colors " +
                  (canSend ? "hover:bg-[#d92843]" : "cursor-not-allowed opacity-50")
                }
              >
                <i className="fab fa-whatsapp" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
