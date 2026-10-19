"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/components/errors/error-screen";

import styles from "./global-error.module.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html data-theme="dark" lang="en">
      <head>
        <title>500 — Something went wrong | Web Band</title>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
      </head>
      <body className={styles.body}>
        <ErrorScreen code="500" onRetry={retry} />
      </body>
    </html>
  );
}
