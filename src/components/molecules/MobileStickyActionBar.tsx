import Link from "next/link";
import { TEL_HREF } from "@/lib/contact";

/**
 * Persistent action bar shown on mobile only — the "Book Appointment" CTA
 * stays reachable on every public page without scrolling. Sits above the
 * iOS home-indicator via `safe-area-inset-bottom`.
 *
 * Pair with `pb-20` on the page wrapper so content isn't hidden underneath.
 */
export function MobileStickyActionBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
      <a
        href={TEL_HREF}
        aria-label="Call clinic"
        className="grid h-12 w-12 flex-none place-items-center rounded-md border-[1.5px] border-link-hover bg-white text-link-hover"
      >
        <i className="fas fa-phone-alt text-[16px]" />
      </a>
      <Link
        href="/book/quick"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cta px-5 py-3 text-[15px] font-semibold text-cta-fg no-underline"
      >
        <i className="fab fa-whatsapp text-[16px]" />
        Book Appointment
      </Link>
    </div>
  );
}
