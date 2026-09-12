"use client";

import en from "@/messages/en.json";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fafaf7",
          color: "#1c1b19",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>
            {en.errors.title}
          </h1>
          <p style={{ fontSize: 14, color: "#6e6c66", margin: 0 }}>
            {en.errors.description}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid #e9e6e0",
              background: "#22211e",
              color: "#fafaf7",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {en.errors.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
