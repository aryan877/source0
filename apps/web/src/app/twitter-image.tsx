import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Source0 - Advanced AI Chat Interface";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
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
          backgroundColor: "#1DA1F2",
          backgroundImage: "linear-gradient(135deg, #1DA1F2 0%, #0084b4 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              backgroundColor: "#fff",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "24px",
            }}
          >
            <span
              style={{
                fontSize: "40px",
                fontWeight: "bold",
                color: "#1DA1F2",
              }}
            >
              S0
            </span>
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              color: "#fff",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Source0
          </div>
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#fff",
            opacity: 0.95,
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Advanced AI Chat Interface
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#fff",
            opacity: 0.8,
            textAlign: "center",
            maxWidth: "900px",
            marginTop: "20px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          🤖 Multi-model AI • 📎 File attachments • 🔍 Web search • 🎤 Voice input
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
