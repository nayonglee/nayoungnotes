import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = { width: 512, height: 512 };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 20%, #ffffff 0%, #f9e8ee 36%, #f3cfdc 60%, #e5f0d6 100%)"
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 78,
            background: "rgba(255, 250, 252, 0.92)",
            border: "4px solid rgba(125, 109, 115, 0.3)",
            boxShadow: "0 20px 40px rgba(175, 146, 157, 0.28)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12
          }}
        >
          <div style={{ fontFamily: "Newsreader", fontSize: 82, color: "#6f6368" }}>NN</div>
          <div style={{ fontSize: 34, color: "#7d6d73" }}>nayoung notes</div>
        </div>
      </div>
    ),
    size
  );
}
