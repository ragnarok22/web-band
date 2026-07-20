"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          background: "#12110f",
          color: "#f5f1e8",
          display: "flex",
          fontFamily: "system-ui, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "440px", textAlign: "center" }}>
          <h1>Web Band could not load</h1>
          <p style={{ color: "#cbc4b8", lineHeight: 1.6 }}>
            Your local work is still on this device. Try loading the app again.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#e7a94b",
              border: 0,
              borderRadius: "12px",
              color: "#21170a",
              font: "inherit",
              fontWeight: 800,
              minHeight: "44px",
              padding: "10px 18px",
            }}
            type="button"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
