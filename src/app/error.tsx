"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/components/errors/error-screen";

interface ApplicationErrorProps {
  error: unknown;
  retry: () => void;
}

export default function ApplicationError({
  error,
  retry,
}: ApplicationErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <title>500 — Something went wrong | Web Band</title>
      <ErrorScreen code="500" onRetry={retry} />
    </>
  );
}
