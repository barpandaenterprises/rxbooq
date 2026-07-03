import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { LoginForm } from "./login-form";
import { getClinicByHostOrSlug } from "@/lib/supabase/clinics";

export const metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

const HIGHLIGHTS = [
  { icon: "fa-bolt",          text: "Book a patient in under 30 seconds" },
  { icon: "fa-shield-alt",    text: "Tenant-isolated and DPDP-friendly" },
  { icon: "fa-mobile-alt",    text: "WhatsApp reminders and confirmations built-in" },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  // Tenant-aware brand panel — show the resolved clinic's name when the user
  // is on a tenant subdomain. Falls back to "Rxbooq" on the apex.
  const h = await headers();
  const slug = h.get("x-clinic-slug");
  const host = h.get("x-host");
  const clinic = await getClinicByHostOrSlug({ slug, host });

  const clinicName = clinic?.name ?? "Rxbooq";
  const tagline    = clinic
    ? "Sign in to manage today's schedule, patients, and messages."
    : "The clinic operating system. Sign in to your workspace.";

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — desktop only */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background: "linear-gradient(160deg, #0E5087 0%, #0168B3 60%, #0a2742 100%)",
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative max-w-md">
          <h2 className="text-[40px] font-semibold leading-[48px]">
            Better care, less paperwork.
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-white/75">
            {tagline}
          </p>

          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-pill bg-white/15 text-[12px] ring-1 ring-white/20">
                  <i className={`fas ${h.icon}`} />
                </span>
                <span className="text-[14px] text-white/85">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[12px] text-white/55">
          © {new Date().getFullYear()} Rxbooq · Made in Sambalpur
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-surface-muted px-4 py-10 sm:px-6 lg:bg-surface lg:py-16">
        <div className="w-full max-w-[400px]">
          {/* Rxbooq logo — present on every login, all breakpoints */}
          <Link href="/" className="mb-8 flex justify-center no-underline">
            <Image
              src="/images/logo/rxbooq-logo.png"
              alt="Rxbooq"
              width={180}
              height={46}
              priority
              className="h-9 w-auto"
            />
          </Link>

          {/* Mobile-only clinic context bar (tenant logins only) */}
          {clinic && (
            <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-[16px] text-brand-fg">
                <i className="fas fa-stethoscope" />
              </span>
              <div className="text-[15px] font-semibold text-heading">{clinicName}</div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface p-7 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] md:p-8">
            <div className="mb-6">
              <h1 className="text-[26px] font-semibold leading-[32px] text-heading md:text-[28px]">
                Welcome back
              </h1>
              <p className="mt-1.5 text-small text-muted">
                Sign in with the email your clinic admin invited you with.
              </p>
            </div>

            <LoginForm initialError={error} next={next} />

            <div className="mt-6 border-t border-border pt-5 text-center text-[12px] text-muted">
              Are you a patient?{" "}
              <a href="/me/login" className="text-link-hover hover:underline">
                View your appointments
              </a>
              .
            </div>
          </div>

          <p className="mt-5 text-center text-[12px] text-muted">
            Need help signing in?{" "}
            <a
              href="tel:+918660394376"
              className="text-link-hover hover:underline"
            >
              +91 86603 94376
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
