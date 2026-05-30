const FEATURES: { icon: string; title: string; desc: string; brand?: boolean }[] = [
  {
    icon:  "fa-globe",
    title: "Public clinic profile",
    desc:  "Every clinic gets a fast, SEO-friendly profile page patients can find and share. Free, forever.",
  },
  {
    icon:  "fa-calendar-check",
    title: "Online scheduling",
    desc:  "Patients self-book in seconds. Per-doctor availability, holiday overrides, no double-booking.",
  },
  {
    icon:  "fa-file-prescription",
    title: "Digital prescriptions & EMR",
    desc:  "Issue prescriptions, track history, and store clinical notes — searchable and exportable.",
  },
  {
    icon:  "fa-whatsapp",
    title: "WhatsApp reminders & broadcasts",
    desc:  "Native Indian-mobile channel. Templates approved, reminders auto-sent, broadcasts gated by plan.",
    brand: true,
  },
  {
    icon:  "fa-users-cog",
    title: "Multi-doctor & departments",
    desc:  "Add doctors, group by department, set per-doctor schedules. Scales from solo to multi-specialty.",
  },
  {
    icon:  "fa-rupee-sign",
    title: "GST-ready Razorpay billing",
    desc:  "Subscriptions in INR with UPI / eMandate. Coupons and partner referrals built in.",
  },
];

export function PlatformFeatureGrid() {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-10 max-w-[640px] text-center md:mb-14">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#E6F1FA] px-3 py-1 text-[12px] font-medium text-link-hover md:mb-5 md:text-[13px]">
            Features
          </span>
          <h2 className="mb-2.5 text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-heading md:text-[36px]">
            Everything a clinic needs. Nothing it doesn&apos;t.
          </h2>
          <p className="text-[14px] leading-[22px] text-muted md:text-[16px]">
            Built specifically for Indian clinics — solo practitioners, multi-doctor practices, and hospitals.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-lg border border-border bg-white p-6 transition-shadow hover:shadow-md">
              <div className={
                "mb-4 grid h-12 w-12 place-items-center rounded-[12px] text-[20px] " +
                (f.brand ? "bg-[#e6f7ec] text-[#25D366]" : "bg-[#E6F1FA] text-brand")
              }>
                <i className={`${f.brand ? "fab" : "fas"} fa-${f.icon.replace(/^fa-/, "")}`} />
              </div>
              <h3 className="mb-1.5 text-[17px] font-semibold text-heading">{f.title}</h3>
              <p className="text-[13px] leading-[20px] text-muted">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
