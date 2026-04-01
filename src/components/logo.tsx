type LogoProps = {
  size?: number;
  className?: string;
};

/**
 * LiminalML logomark — a gateway (two pillars) with a neural node at the threshold.
 * Uses `currentColor` so it inherits the parent's text color.
 */
export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left pillar */}
      <rect x="1.5" y="3" width="4.5" height="18" rx="1.75" fill="currentColor" opacity="0.45" />
      {/* Right pillar */}
      <rect x="18" y="3" width="4.5" height="18" rx="1.75" fill="currentColor" opacity="0.45" />
      {/* Connector lines */}
      <line x1="6" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.35" />
      <line x1="15" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.35" />
      {/* Neural node — the liminal threshold point */}
      <circle cx="12" cy="12" r="3.25" fill="currentColor" />
      {/* Subtle inner ring for depth */}
      <circle cx="12" cy="12" r="1.5" fill="none" stroke="var(--background, #09090f)" strokeWidth="1.25" opacity="0.6" />
    </svg>
  );
}
