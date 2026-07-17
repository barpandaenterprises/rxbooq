import Link from "next/link";

/**
 * Always-visible WhatsApp CTA on the marketing site. Opens a WhatsApp chat to
 * the RxBooq support number with a friendly prefilled message. Plain anchor —
 * no client JS needed. Sits bottom-right (the conventional WhatsApp position);
 * the lead-form "Talk to us" button lives bottom-left so the two never overlap.
 */

// Support number in wa.me format (country code + number, digits only).
const WHATSAPP_NUMBER = "918660394376";
const PREFILL = "Hi RxBooq team, I'd like to know more.";

export function PlatformWhatsAppFab() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILL)}`;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-pill bg-[#25D366] px-5 py-3.5 text-[14px] font-semibold text-white no-underline shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] transition-colors hover:bg-[#1ebe5b] md:bottom-7 md:right-7"
    >
      <i className="fab fa-whatsapp text-[18px]" />
      <span className="hidden sm:inline">WhatsApp us</span>
    </Link>
  );
}
