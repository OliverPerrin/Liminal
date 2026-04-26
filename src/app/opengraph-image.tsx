import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LiminalML — Structured prep for ML and SWE interviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0f14",
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,106,255,0.18) 0%, transparent 70%)",
          padding: 80,
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 28 }}>
          <span
            style={{
              fontSize: 104,
              fontStyle: "italic",
              fontWeight: 600,
              letterSpacing: "0.005em",
              backgroundImage: "linear-gradient(135deg, #10b981 0%, #818cf8 100%)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1,
            }}
          >
            Liminal
          </span>
          <span
            style={{
              fontSize: 76,
              color: "#9da0bf",
              fontWeight: 600,
              marginLeft: 14,
              lineHeight: 1,
            }}
          >
            ML
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "#dadcec",
            fontSize: 38,
            textAlign: "center",
            maxWidth: 980,
            lineHeight: 1.3,
            fontWeight: 500,
          }}
        >
          Structured prep for ML and SWE interviews
        </div>

        {/* Stat row */}
        <div
          style={{
            color: "#7878a0",
            fontSize: 24,
            marginTop: 36,
            display: "flex",
            gap: 28,
          }}
        >
          <span>130+ topics</span>
          <span>·</span>
          <span>6-stage sessions</span>
          <span>·</span>
          <span>Personalized to your resume</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
