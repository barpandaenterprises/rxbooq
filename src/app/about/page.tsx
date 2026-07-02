import type { Metadata } from "next";
import Link from "next/link";

import { PlatformSiteLayout } from "@/components/layouts/PlatformSiteLayout";

export const metadata: Metadata = {
  title:       "About — Rxbooq",
  description:
    "Rxbooq is a healthcare technology platform empowering providers with modern digital tools while making healthcare more convenient for patients.",
  openGraph: {
    title:       "About Rxbooq",
    description: "Empowering healthcare. Connecting lives.",
    type:        "website",
  },
};

const VALUES: { icon: string; title: string; body: string }[] = [
  {
    icon: "fa-heart",
    title: "Patient First",
    body: "Every innovation begins with one question: how does this improve the patient experience?",
  },
  {
    icon: "fa-shield-alt",
    title: "Trust & Transparency",
    body: "We believe healthcare technology must be reliable, secure, and transparent in every interaction.",
  },
  {
    icon: "fa-lightbulb",
    title: "Innovation with Purpose",
    body: "We leverage modern technologies, including artificial intelligence and automation, to solve real-world healthcare challenges.",
  },
  {
    icon: "fa-feather-alt",
    title: "Simplicity",
    body: "Powerful technology should be easy to use. Our solutions are designed to reduce complexity, not create it.",
  },
  {
    icon: "fa-chart-line",
    title: "Continuous Growth",
    body: "We continuously evolve our platform to help healthcare providers adapt, compete, and thrive in an increasingly digital world.",
  },
];

const REASONS: string[] = [
  "Comprehensive appointment booking and scheduling",
  "Professional digital profiles for doctors and healthcare institutions",
  "Practice growth through AI-powered digital marketing and local SEO",
  "Secure patient engagement and communication tools",
  "Intelligent automation that saves time and improves efficiency",
  "Scalable solutions for doctors, clinics, hospitals, and healthcare networks",
];

export default function AboutPage() {
  return (
    <PlatformSiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F8FB] to-white">
        <div className="mx-auto max-w-[860px] px-5 py-12 text-center md:px-8 md:py-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-pill bg-[#E6F1FA] px-3.5 py-1.5 text-[13px] font-medium text-link-hover">
            <i className="fas fa-heartbeat text-[11px]" />
            About Rxbooq
          </span>
          <h1 className="text-[34px] font-semibold leading-[1.12] tracking-[-0.01em] text-heading md:text-[48px]">
            Healthcare is built on trust.
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-[16px] leading-[27px] text-muted md:text-[18px] md:leading-[30px]">
            Finding the right doctor, managing appointments, and delivering exceptional patient
            experiences should be simple, seamless, and accessible for everyone.
          </p>
        </div>
      </section>

      {/* Intro narrative */}
      <section className="mx-auto max-w-[920px] px-5 py-10 md:px-8 md:py-14">
        <div className="space-y-5 text-[15px] leading-[27px] text-body md:text-[16px] md:leading-[29px]">
          <p>
            Rxbooq was created with a singular purpose — to empower healthcare providers with modern
            digital tools while making healthcare more convenient for patients.
          </p>
          <p>
            From independent practitioners to multi-specialty clinics and hospitals, Rxbooq offers an
            integrated platform that enables healthcare professionals to establish a strong digital
            presence, manage appointments, streamline patient interactions, and grow their practice
            with confidence. By combining intelligent technology with user-centric design, we help
            providers spend less time managing operations and more time caring for patients.
          </p>
          <p>
            As healthcare continues to evolve, Rxbooq is committed to building solutions that bridge
            the gap between patients and providers through innovation, automation, and digital
            transformation.
          </p>
          <p className="rounded-lg border border-border bg-[#fafbfc] p-5 text-[14px] leading-[24px] text-muted md:text-[15px] md:leading-[26px]">
            Rxbooq is a healthcare technology platform developed and operated by{" "}
            <span className="font-medium text-heading">Barpanda Enterprises Private Limited</span>, a
            company focused on building innovative digital products and technology solutions that
            create meaningful impact across industries.
          </p>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-[#fafbfc] py-14 md:py-20">
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-5 px-5 md:grid-cols-2 md:gap-6 md:px-8">
          <div className="rounded-xl border border-border bg-white p-7 md:p-8">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-[#E6F1FA] text-[18px] text-brand">
              <i className="fas fa-eye" />
            </span>
            <h2 className="mt-4 text-[20px] font-semibold text-heading md:text-[22px]">Our Vision</h2>
            <p className="mt-2.5 text-[15px] leading-[26px] text-muted">
              To become India&apos;s most trusted digital healthcare ecosystem, connecting every
              patient with quality healthcare providers through technology that is simple,
              intelligent, and accessible.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-7 md:p-8">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-[#E6F1FA] text-[18px] text-brand">
              <i className="fas fa-bullseye" />
            </span>
            <h2 className="mt-4 text-[20px] font-semibold text-heading md:text-[22px]">Our Mission</h2>
            <p className="mt-2.5 text-[15px] leading-[26px] text-muted">
              To digitally empower healthcare professionals by providing affordable, secure, and
              scalable solutions that simplify practice management, improve patient engagement, and
              enable sustainable growth — making quality healthcare more accessible through seamless
              digital experiences for both providers and patients.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-[1100px] px-5 py-12 md:px-8 md:py-16">
        <div className="text-center">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">What drives us</p>
          <h2 className="mt-1.5 text-[28px] font-semibold text-heading md:text-[34px]">Our Values</h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(16,24,40,0.16)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-md bg-[#E6F1FA] text-[17px] text-brand">
                <i className={`fas ${v.icon}`} />
              </span>
              <h3 className="mt-4 text-[16px] font-semibold text-heading">{v.title}</h3>
              <p className="mt-2 text-[14px] leading-[23px] text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Rxbooq */}
      <section className="bg-[#fafbfc] py-12 md:py-16">
        <div className="mx-auto max-w-[1000px] px-5 md:px-8">
          <div className="text-center">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-cta">The platform</p>
            <h2 className="mt-1.5 text-[28px] font-semibold text-heading md:text-[34px]">Why Rxbooq?</h2>
          </div>
          <ul className="mx-auto mt-10 grid max-w-[860px] grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4">
            {REASONS.map((r) => (
              <li
                key={r}
                className="flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3.5"
              >
                <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-pill bg-[#1f7a3a]/10 text-[10px] text-[#1f7a3a]">
                  <i className="fas fa-check" />
                </span>
                <span className="text-[14px] leading-[22px] text-body">{r}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-9 max-w-[680px] text-center text-[15px] leading-[26px] text-muted">
            At Rxbooq, we believe that when healthcare professionals succeed, patients receive better
            care. Every feature we build is designed to strengthen that connection and help shape the
            future of healthcare.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-brand">
        <div className="mx-auto max-w-[900px] px-5 py-12 text-center md:px-8 md:py-16">
          <h2 className="text-[24px] font-semibold leading-tight text-white md:text-[30px]">
            Empowering Healthcare. Connecting Lives.
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[25px] text-white/85">
            Join the clinics already growing their practice with Rxbooq.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-[15px] font-medium text-brand no-underline transition-colors hover:bg-white/90 sm:w-auto"
            >
              <i className="fas fa-rocket text-[13px]" />
              Start free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/40 px-6 py-3 text-[15px] font-medium text-white no-underline transition-colors hover:bg-white/10 sm:w-auto"
            >
              See pricing
              <i className="fas fa-arrow-right text-[11px]" />
            </Link>
          </div>
        </div>
      </section>
    </PlatformSiteLayout>
  );
}
