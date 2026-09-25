import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default share image for every page that doesn't set its own (property
// pages use their cover photo). Rendered at build time from the brand config.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#faf8f4",
          color: "#1c1c1a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#1c1c1a",
              color: "#faf8f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            {brand.name[0]}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>{brand.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, maxWidth: 960 }}>
            {brand.tagline}
          </div>
          <div style={{ fontSize: 30, color: "#6b6a66" }}>{brand.launchRegion.label}</div>
        </div>
      </div>
    ),
    size,
  );
}
