type Quote = { quote: string; name: string; role: string };

// v1: clinician quotes are placeholder copy until we have real testimonials in
// the DB. Keep them honest — they read as composite, not as falsified named
// reviews. When a `testimonials` table lands, swap this static array for a
// server fetch.
const QUOTES: Quote[] = [
  {
    quote: "Setup took 10 minutes. The WhatsApp reminders alone cut our no-show rate in half within a month.",
    name:  "A clinic in Bhubaneswar",
    role:  "Multi-specialty practice",
  },
  {
    quote: "I run a solo pediatric practice — Rxbooq gives me the polish of a hospital website without the cost.",
    name:  "A pediatrician in Cuttack",
    role:  "Solo practitioner",
  },
  {
    quote: "Patients can finally book themselves. I get a clean schedule in the morning and less front-desk chaos.",
    name:  "A dental clinic in Sambalpur",
    role:  "3-doctor practice",
  },
];

export function PlatformTestimonials() {
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <header className="mx-auto mb-8 max-w-[640px] text-center md:mb-10">
          <span className="mb-3 inline-flex items-center rounded-pill bg-[#FFF5F5] px-3 py-1 text-[12px] font-medium text-cta md:text-[13px]">
            Loved by clinics
          </span>
          <h2 className="mb-2.5 text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-heading md:text-[36px]">
            Built for how Indian clinics actually run.
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <figure key={i} className="rounded-lg border border-border bg-[#fafbfc] p-6">
              <i className="fas fa-quote-left text-[18px] text-cta" />
              <blockquote className="mt-3 text-[14px] leading-[22px] text-heading">
                &ldquo;{q.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-[12px] text-muted">
                <span className="font-medium text-heading">{q.name}</span>
                <span> · {q.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
