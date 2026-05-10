export function DeliveryFailedPill() {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-[#F4D9A8] bg-[#FFF8EC] px-3.5 py-2 text-[13px] text-[#7a5c2b]">
      <i className="fas fa-exclamation-triangle text-[12px] text-[#d69e1a]" />
      Couldn&rsquo;t send WhatsApp — we&rsquo;ll call you to confirm.
    </span>
  );
}
