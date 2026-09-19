"use client";

import en from "@/messages/en.json";

/**
 * Last-resort boundary — no app chrome, fonts, or Tailwind. Inline styles
 * use the same tokens as docs/01 §2 so the page still matches if CSS fails.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body
        style={{
          margin: 0,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, sans-serif',
          background: "#fafaf7",
          color: "#1c1b19",
        }}
      >
        <main
          style={{
            display: "flex",
            maxWidth: 384,
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            textAlign: "center",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "Newsreader, Georgia, ui-serif, serif",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              {en.errors.title}
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#6e6c66",
              }}
            >
              {en.errors.description}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              padding: "0 16px",
              border: "none",
              borderRadius: 9999,
              background: "#22211e",
              color: "#fafaf7",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 500,
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
