type ThreadStatus = "delivered" | "read" | "replied" | "failed" | "optout";

type Thread = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  lastTpl: string;
  status: ThreadStatus;
  ts: string;
  preview: string;
  unread?: boolean;
  active?: boolean;
  failed?: boolean;
  optout?: boolean;
};

const THREADS: Thread[] = [
  { id: "t1", name: "Bidyut Panda",   initials: "BP", avatarBg: "#E6F1FA", avatarFg: "#0E5087", lastTpl: "booking_confirmation_v1", status: "replied",   ts: "just now", preview: "Yes please confirm",                       unread: true, active: true },
  { id: "t2", name: "Anita Sahu",     initials: "AS", avatarBg: "#FFE7EC", avatarFg: "#EE344E", lastTpl: "reminder_24h_v2",         status: "read",      ts: "2m",       preview: "See you tomorrow at 5:30 PM" },
  { id: "t3", name: "Sarita Mahanti", initials: "SM", avatarBg: "#FFF8EC", avatarFg: "#7a5c2b", lastTpl: "noshow_followup_v1",      status: "failed",    ts: "14m",      preview: "undelivered · phone unreachable",         failed: true },
  { id: "t4", name: "Karthik Rao",    initials: "KR", avatarBg: "#FFE7EC", avatarFg: "#EE344E", lastTpl: "booking_confirmation_v1", status: "read",      ts: "18m",      preview: "Got it, thanks" },
  { id: "t5", name: "Pinky Sahu",     initials: "PS", avatarBg: "#E6F1FA", avatarFg: "#0E5087", lastTpl: "booking_confirmation_v1", status: "read",      ts: "22m",      preview: "OK" },
  { id: "t6", name: "Suresh Pati",    initials: "SP", avatarBg: "#E6F4EC", avatarFg: "#3a8b5e", lastTpl: "reminder_24h_v2",         status: "replied",   ts: "31m",      preview: "Can we move to 4 PM?" },
  { id: "t7", name: "Manoj Behera",   initials: "MB", avatarBg: "#E6F4EC", avatarFg: "#3a8b5e", lastTpl: "reminder_24h_v2",         status: "delivered", ts: "46m",      preview: "—" },
  { id: "t8", name: "Laxmi Pradhan",  initials: "LP", avatarBg: "#F4E5FA", avatarFg: "#6b3aa1", lastTpl: "cancellation_ack_v1",     status: "read",      ts: "1h",       preview: "Thanks for confirming." },
  { id: "t9", name: "Rajesh Mishra",  initials: "RM", avatarBg: "#F4F5F7", avatarFg: "#9aa9b8", lastTpl: "reminder_24h_v2",         status: "optout",    ts: "2d",       preview: "STOP",                                    optout: true },
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

function ThreadRow({ t }: { t: Thread }) {
  return (
    <div
      className="relative flex cursor-pointer items-start gap-3 border-b border-[#F4F5F7] p-4"
      style={{
        background: t.active ? "#F9FBFD" : "#fff",
        boxShadow: t.active ? "inset 3px 0 0 #0168B3" : "none",
      }}
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
    </div>
  );
}

function ThreadList() {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface-muted px-3 py-2.5">
          <i className="fas fa-search text-[13px] text-[#9aa9b8]" />
          <span className="text-[13px] text-[#9aa9b8]">Search messages or patients…</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[
            { l: "All", c: 124, active: true },
            { l: "Unread", c: 3 },
            { l: "Failed", c: 2 },
            { l: "Replied", c: 18 },
          ].map((f) => (
            <button
              key={f.l}
              type="button"
              className={
                "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[12px] font-medium " +
                (f.active ? "bg-brand text-white" : "border border-border bg-white text-heading")
              }
            >
              {f.l}
              <span
                className={"text-[10px] font-semibold " + (f.active ? "text-white/80" : "text-[#9aa9b8]")}
              >
                {f.c}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {THREADS.map((t) => <ThreadRow key={t.id} t={t} />)}
      </div>
    </div>
  );
}

function InboundBubble({ children, ts }: { children: React.ReactNode; ts: string }) {
  return (
    <div className="mb-3.5 flex justify-start">
      <div className="max-w-[380px] rounded-[12px] rounded-bl-[4px] border border-border bg-white px-3.5 py-2.5">
        <div className="text-[14px] leading-5 text-heading">{children}</div>
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
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md bg-cta px-3 py-1.5 text-[12px] font-medium text-cta-fg">
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

function ContextCard() {
  return (
    <div className="mx-5 mt-3.5 flex items-center gap-3.5 rounded-md border border-border bg-white px-4 py-3">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-[#FFE7EC] text-[14px] text-cta">
        <i className="fas fa-tooth" />
      </span>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-heading">
          Tooth extraction · 9 May 2026, 3:30 PM
        </div>
        <div className="mt-0.5 text-[12px] text-muted">
          Dr. Manoranjan Mahakur · 30 min · Booking #DK-3942
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

function ConversationPane() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F9FBFD]"
      style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(1,104,179,0.05) 1px, transparent 0)",
        backgroundSize: "20px 20px",
      }}
    >
      <header className="flex items-center gap-3 border-b border-border bg-white px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-pill bg-[#E6F1FA] text-[13px] font-semibold text-link-hover">
          BP
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-heading">Bidyut Panda</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#3a8b5e]">
            <span className="h-1.5 w-1.5 rounded-pill bg-[#3a8b5e]" />
            Online · +91 96••• ••018
          </div>
        </div>
        <button
          type="button"
          aria-label="Call"
          className="grid h-9 w-9 place-items-center rounded-pill border border-border bg-white text-muted"
        >
          <i className="fas fa-phone text-[13px]" />
        </button>
        <button
          type="button"
          aria-label="More"
          className="grid h-9 w-9 place-items-center rounded-pill border border-border bg-white text-muted"
        >
          <i className="fas fa-ellipsis-v text-[13px]" />
        </button>
      </header>

      <ContextCard />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 mt-1 text-center">
          <span className="rounded-pill bg-white/70 px-3 py-0.5 text-[11px] text-[#9aa9b8]">
            Today · 9 May 2026
          </span>
        </div>

        <OutboundBubble tpl="booking_confirmation_v1" status="read" ts="3:31 PM">
          {`Hi Bidyut, your appointment at Mahakur Poly Dental is booked.\nTooth extraction · 9 May 2026, 3:30 PM with Dr. Manoranjan Mahakur.\n\nPlease reply YES to confirm or RESCHEDULE.`}
        </OutboundBubble>
        <InboundBubble ts="3:32 PM">YES</InboundBubble>
        <OutboundBubble tpl="reminder_24h_v2" status="read" ts="2:30 PM">
          {`Reminder: your appointment is in 1 hour at Mahakur Poly Dental, Bhatra Chowk.\nReply 1 to confirm, 2 to reschedule.`}
        </OutboundBubble>
        <InboundBubble ts="2:33 PM">Yes please confirm</InboundBubble>
        <OutboundBubble tpl="customer_care_reply" failed ts="3:01 PM">
          Thanks Bidyut! See you at 3:30 PM. Please arrive 5 min early.
        </OutboundBubble>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-white px-5 py-4">
        <div className="mb-2.5 flex items-center gap-2.5 text-[11px] text-[#9aa9b8]">
          <i className="fas fa-info-circle text-[12px]" />
          Outside the 24-hour window — only approved templates can be sent.
        </div>
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            className="inline-flex min-w-[240px] items-center justify-between gap-2 rounded-md border border-border bg-white px-3.5 py-2.5 text-[13px] text-heading"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[10px] text-muted">
                customer_care_reply
              </code>
            </span>
            <i className="fas fa-chevron-down text-[10px] text-[#9aa9b8]" />
          </button>
          <div className="flex flex-1 items-center rounded-md border border-border bg-surface-muted px-3.5 py-2.5 text-[14px] text-heading">
            Thanks{" "}
            <span className="mx-1 rounded-sm bg-[#FFF1D6] px-1.5 py-0.5 text-[12px] font-semibold text-[#7a5c2b]">
              {"{{name}}"}
            </span>{" "}
            ! See you at{" "}
            <span className="mx-1 rounded-sm bg-[#FFF1D6] px-1.5 py-0.5 text-[12px] font-semibold text-[#7a5c2b]">
              {"{{time}}"}
            </span>
            .
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-3.5 py-2 text-[13px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
          >
            <i className="fas fa-eye" /> Preview
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-medium text-cta-fg hover:bg-[#d92843]"
          >
            <i className="fab fa-whatsapp" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesHeader() {
  return (
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
        <span className="text-[12px] text-[#9aa9b8]">· 124 conversations · 18 unread</span>
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
  );
}

export function AdminMessages() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessagesHeader />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[380px_1fr]">
        <div className="hidden md:block">
          <ThreadList />
        </div>
        <ConversationPane />
      </div>
    </div>
  );
}
