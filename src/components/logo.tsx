import { cn } from "@/lib/utils";

type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 22, className }: LogoProps) {
  return (
    <span className={cn("select-none inline-flex items-baseline", className)}>
      <span
        style={{
          fontFamily: "var(--font-fraunces)",
          fontStyle: "italic",
          fontOpticalSizing: "auto",
          background: "linear-gradient(135deg, #10b981 0%, #818cf8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "0.01em",
          fontSize: size ? `${size * 1.1}px` : undefined,
          lineHeight: 1,
        }}
      >
        Liminal
      </span>
      <span
        style={{
          fontFamily: "var(--font-geist-mono)",
          fontSize: size ? `${Math.round(size * 0.82)}px` : undefined,
          color: "var(--logo-ml-color, var(--muted))",
          letterSpacing: "0.01em",
          fontWeight: 600,
          marginLeft: "3px",
          lineHeight: 1,
        }}
      >
        ML
      </span>
    </span>
  );
}
