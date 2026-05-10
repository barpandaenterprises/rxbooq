type Props = { size?: number };

export function SuccessIllo({ size = 180 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <pattern id="dk-success-dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#cfe1ee" />
        </pattern>
      </defs>
      <circle cx="100" cy="100" r="84" fill="#E6F1FA" />
      <circle cx="100" cy="100" r="84" fill="url(#dk-success-dots)" opacity="0.6" />
      {/* Calendar */}
      <rect x="56" y="60" width="88" height="84" rx="10" fill="#fff" stroke="#0168B3" strokeWidth="2.5" />
      <line x1="56" y1="84" x2="144" y2="84" stroke="#0168B3" strokeWidth="2.5" />
      <line x1="76" y1="50" x2="76" y2="68" stroke="#0168B3" strokeWidth="3" strokeLinecap="round" />
      <line x1="124" y1="50" x2="124" y2="68" stroke="#0168B3" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="118" r="20" fill="#0168B3" />
      <path
        d="M91 118 l7 7 l13 -14"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Sparkles */}
      <path d="M40 70 l3 3 M46 64 l-3 -3 M40 64 l3 -3 M46 70 l-3 3" stroke="#EE344E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M156 50 l3 3 M162 44 l-3 -3 M156 44 l3 -3 M162 50 l-3 3" stroke="#EE344E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M160 140 l3 3 M166 134 l-3 -3" stroke="#0E5087" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
