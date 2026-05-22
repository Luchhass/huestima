import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/constants";

export const alt = "Huestima color memory game";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function LogoMark() {
  return (
    <div
      style={{
        width: 148,
        height: 148,
        borderRadius: 999,
        background:
          "linear-gradient(135deg, #9d6cff 0%, #45a6ff 20%, #32d989 40%, #f7d046 60%, #ff5f7a 80%, #9d6cff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 30px 70px rgba(0,0,0,0.32)",
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 999,
          background: "#ffffff",
        }}
      />
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: 1040,
            height: 470,
            padding: 56,
            borderRadius: 52,
            background: "#000000",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 32px 90px rgba(0,0,0,0.24)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <LogoMark />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>
                {APP_NAME}
              </div>
              <div style={{ marginTop: 8, fontSize: 30, color: "rgba(255,255,255,0.72)" }}>
                See it once. Match it from memory.
              </div>
            </div>
          </div>

          <div
            style={{
              maxWidth: 860,
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.2,
            }}
          >
            Memorize a color for five seconds, rebuild it with HSV controls,
            and score your precision across five rounds.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
