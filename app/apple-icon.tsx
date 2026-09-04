import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#A4D6C6",
          borderRadius: 50,
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path
            d="M6 22 L13 11 L18 17 L26 8"
            fill="none"
            stroke="#2C4C2A"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="8" r="2.1" fill="#829328" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
