/**
 * CommSysLab brand mark: an analog sine wave (left) morphs into a digital square wave
 * (right) — the analog-to-digital story. The rounded container fills with --scope-bg,
 * which is dark in BOTH themes, so the wave keeps identical contrast in light and dark
 * mode. Wave + border use the brand accent gradient (tokens).
 */
export function BrandIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="CommSysLab"
      className="brand-icon"
    >
      <defs>
        <linearGradient id="brand-wave" x1="9" y1="24" x2="39" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="0.55" stopColor="var(--accent-blue)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
        <linearGradient id="brand-border" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="var(--accent-blue)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--accent-2)" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect
        x="2.5"
        y="2.5"
        width="43"
        height="43"
        rx="12"
        fill="var(--scope-bg)"
        stroke="url(#brand-border)"
        strokeWidth="1.6"
      />
      <path
        d="M9 24 C 10.8 14.5, 13.7 14.5, 15.5 24 C 17.3 33.5, 20.2 33.5, 22 24"
        stroke="url(#brand-wave)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 24 H 25 V 15 H 31 V 33 H 37 V 24 H 39"
        stroke="url(#brand-wave)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
