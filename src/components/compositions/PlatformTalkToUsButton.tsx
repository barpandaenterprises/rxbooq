"use client";

import Link from "next/link";

/**
 * Header "Talk to us" CTA that scrolls to the home-page lead form.
 *
 * A plain `<a href="/#lead-form">` scrolls the first time, but a second click
 * is a no-op: the URL hash is already `#lead-form`, so the browser skips the
 * jump. We handle the click ourselves and call scrollIntoView every time (which
 * still honours the section's scroll-margin-top for the sticky header). On
 * pages without the form we fall through to normal Link navigation home.
 */
export function PlatformTalkToUsButton() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById("lead-form");
    if (!el) return; // not on this page — let the Link navigate to /#lead-form
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Keep the address bar in sync without pushing a new history entry.
    window.history.replaceState(null, "", "/#lead-form");
  };

  return (
    <Link
      href="/#lead-form"
      onClick={handleClick}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-brand/30 bg-[#EDEBFB] px-3 py-2 text-[14px] font-semibold text-brand no-underline transition-colors hover:bg-brand hover:text-white md:px-[18px]"
    >
      <i className="fas fa-headset text-[12px]" />
      <span className="hidden sm:inline">Talk to us</span>
    </Link>
  );
}
