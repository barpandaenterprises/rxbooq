"use client";

import { useState } from "react";

type Testimonial = { q: string; n: string; r: string; initials: string };

const TESTIMONIALS: Testimonial[] = [
  {
    q: "I was terrified of dentists my whole life. Dr. Mahakur did my root canal in one sitting — completely painless. Booking on WhatsApp was so easy.",
    n: "Priya Sahu",
    r: "Patient · Sambalpur",
    initials: "PS",
  },
  {
    q: "Got braces fitted for my daughter here. The team is wonderful with kids and explained every step. Reasonable pricing and clean clinic.",
    n: "Rajesh Mishra",
    r: "Parent · Bargarh",
    initials: "RM",
  },
  {
    q: "Came in for a checkup, ended up getting two implants. Five months on, no issues. Confident I picked the right clinic in town.",
    n: "Sunita Pradhan",
    r: "Patient · Sambalpur",
    initials: "SP",
  },
  {
    q: "Dr. Lipsa is brilliant with anxious patients. My cleaning and scaling were quick and gentle, and the staff explained the aftercare in Odia.",
    n: "Amit Behera",
    r: "Patient · Jharsuguda",
    initials: "AB",
  },
  {
    q: "The reminders on WhatsApp meant I never missed a session. Smile makeover took three visits and the result is exactly what I asked for.",
    n: "Meera Sahoo",
    r: "Patient · Sambalpur",
    initials: "MS",
  },
];

const PAGE_SIZE = 3;

export function TestimonialsCarousel() {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, TESTIMONIALS.length - PAGE_SIZE + 1);
  const visible = TESTIMONIALS.slice(page, page + PAGE_SIZE);

  const goPrev = () => setPage((p) => (p - 1 + totalPages) % totalPages);
  const goNext = () => setPage((p) => (p + 1) % totalPages);

  return (
    <section id="testimonials" className="bg-surface-warm pb-24 scroll-mt-24">
      <div className="mx-auto max-w-[1200px] px-8">
        <header className="mx-auto mb-12 max-w-[640px] text-center">
          <span className="mb-5 inline-flex items-center rounded-pill bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#b8253a]">
            Testimonials
          </span>
          <h2 className="text-h2 tracking-[-0.01em]">What our patients say</h2>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {visible.map((t) => (
            <article
              key={t.n}
              className="flex flex-col gap-4 rounded-md border border-[#f3d3d8] bg-white p-7 shadow-sm"
            >
              <div className="text-[14px] tracking-[2px] text-[#F4B400]">★ ★ ★ ★ ★</div>
              <p className="text-[16px] leading-[26px] text-body">&ldquo;{t.q}&rdquo;</p>
              <div className="mt-auto flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-pill bg-[#f3d3d8] text-[14px] font-semibold text-[#b8253a]">
                  {t.initials}
                </div>
                <div>
                  <div className="text-[14px] font-semibold leading-[18px] text-heading">
                    {t.n}
                  </div>
                  <div className="text-[12px] text-muted">{t.r}</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous testimonials"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-pill border border-border bg-white text-link transition-colors hover:border-link-hover hover:text-link-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            <i className="fas fa-chevron-left text-[12px]" />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to testimonials page ${i + 1}`}
              aria-current={i === page}
              onClick={() => setPage(i)}
              className={
                "h-2 cursor-pointer rounded-pill transition-[width,background-color] " +
                (i === page ? "w-6 bg-cta" : "w-2 bg-[#f3d3d8] hover:bg-[#e6b9c1]")
              }
            />
          ))}
          <button
            type="button"
            onClick={goNext}
            aria-label="Next testimonials"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-pill border border-border bg-white text-link transition-colors hover:border-link-hover hover:text-link-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            <i className="fas fa-chevron-right text-[12px]" />
          </button>
        </div>
      </div>
    </section>
  );
}
