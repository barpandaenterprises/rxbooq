import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Get started — Rxbooq",
  description: "Set up your clinic on Rxbooq in under 5 minutes.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafbfc] text-body">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex flex-none items-center no-underline">
            <Image
              src="/images/logo/rxbooq-logo.png"
              alt="Rxbooq"
              width={160}
              height={41}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <Link
            href="/login"
            className="text-[13px] font-medium text-muted no-underline hover:text-heading"
          >
            Already on Rxbooq? Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-16">{children}</main>
    </div>
  );
}
