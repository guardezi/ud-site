import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
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
          background: "#141417",
          color: "#54F251",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-0.05em",
        }}
      >
        UD
      </div>
    ),
    { ...size },
  );
}
