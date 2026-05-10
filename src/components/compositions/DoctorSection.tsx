import Image from "next/image";
import { DoctorProfileDialog } from "@/components/molecules/DoctorProfileDialog";

const CREDS = [
  { icon: "fa-graduation-cap", label: "MDS, MPH, PHDMC" },
  { icon: "fa-id-badge", label: "Reg. No. 446/A" },
  { icon: "fa-university", label: "BCB Dental College, Cuttack" },
];

const META = [
  { n: "20+", l: "Years experience" },
  { n: "8,400+", l: "Patients treated" },
  { n: "1,200+", l: "Implants & RCTs" },
];

export function DoctorSection() {
  return (
    <section id="doctor" className="scroll-mt-20 bg-surface-warm py-14 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
          <div className="relative h-72 overflow-hidden rounded-lg bg-surface-warm md:h-[460px]">
            <Image
              src="/images/dr-manoranjan-mahakur.jpg"
              alt="Portrait of Dr. Manoranjan Mahakur"
              fill
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover object-top"
            />
          </div>

          <div>
            <span className="inline-flex items-center rounded-pill bg-white px-3 py-1 text-[12px] font-medium text-[#b8253a] md:px-3.5 md:py-1.5 md:text-[13px]">
              Meet your dentist
            </span>
            <h2 className="mt-3 text-[26px] font-semibold leading-8 tracking-[-0.01em] text-heading md:mt-4 md:text-h2">
              Dr. Manoranjan Mahakur, MDS
            </h2>
            <p className="mt-2.5 text-[15px] leading-[24px] text-muted md:mt-3 md:text-paragraph">
              Senior dental surgeon trained at BCB Dental College, Cuttack.
              Consultant Cosmetologist and Implantologist with a focus on painless
              root canals, smile makeovers and dental implants — supported by an
              everyday team led by Dr. Lipsa Pradhan (MDS).
            </p>

            <div className="my-5 flex flex-wrap gap-2 md:my-6">
              {CREDS.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-[#f3d3d8] bg-white px-3 py-1 text-[12px] font-medium text-link-hover md:px-3.5 md:py-1.5 md:text-[13px]"
                >
                  <i className={`fas ${c.icon}`} />
                  {c.label}
                </span>
              ))}
            </div>

            <div className="mb-5 flex flex-wrap gap-6 border-y border-[#f3d3d8] py-4 md:mb-6 md:gap-8 md:py-5">
              {META.map((m) => (
                <div key={m.l}>
                  <div className="text-[20px] font-bold text-link-hover md:text-[24px]">{m.n}</div>
                  <div className="text-[12px] text-muted md:text-[13px]">{m.l}</div>
                </div>
              ))}
            </div>

            <DoctorProfileDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px] border-link-hover bg-transparent px-5 py-3 text-[15px] font-medium text-link-hover transition-colors hover:bg-link-hover hover:text-white md:w-auto md:px-[22.5px] md:py-[10.5px]"
                >
                  View profile <i className="fas fa-arrow-right text-[11px]" />
                </button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
