export function EmptySlotIllo() {
  return (
    <div className="flex flex-col items-center py-6 text-[#9aa9b8]">
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
        <rect
          x="14"
          y="14"
          width="92"
          height="58"
          rx="8"
          stroke="#cdd9e4"
          strokeWidth="1.5"
          fill="#fff"
        />
        <line x1="14" y1="30" x2="106" y2="30" stroke="#cdd9e4" strokeWidth="1.5" />
        <circle cx="32" cy="22" r="2" fill="#cdd9e4" />
        <circle cx="88" cy="22" r="2" fill="#cdd9e4" />
        <line
          x1="40"
          y1="50"
          x2="80"
          y2="50"
          stroke="#EE344E"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="44"
          y1="58"
          x2="76"
          y2="58"
          stroke="#cdd9e4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-3.5 text-[14px] font-medium text-heading">
        No slots available for this date
      </div>
      <div className="mt-1 text-[13px] text-[#9aa9b8]">
        Try another day or call us at +91 94370 12345.
      </div>
    </div>
  );
}
