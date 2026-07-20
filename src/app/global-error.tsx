"use client";

import { useEffect } from "react";

import styles from "./global-error.module.css";

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
      <body className={styles.body}>
        <main className={styles.main}>
          <h1>Web Band could not load</h1>
          <p className={styles.description}>
            Your local work is still on this device. Try loading the app again.
          </p>
          <button className={styles.button} onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
