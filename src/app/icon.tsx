import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "#1c1c1a",
          color: "#faf8f4",
          fontSize: 40,
          fontWeight: 700,
        }}
      >
        {brand.name[0]}
      </div>
    ),
    size,
  );
}
