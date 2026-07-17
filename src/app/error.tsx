"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect } from "react";

interface ApplicationErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ApplicationError({
  error,
  reset,
}: ApplicationErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="border-danger/30 bg-surface max-w-md rounded-2xl border p-6 text-center shadow-2xl">
        <CircleAlert
          aria-hidden="true"
          className="text-danger mx-auto size-10"
        />
        <h1 className="text-foreground mt-4 text-2xl font-black">
          The practice room hit a snag
        </h1>
        <p className="text-muted mt-2 leading-6">
          Your saved local settings are untouched. Try loading this section
          again.
        </p>
        <button
          className="bg-accent text-accent-ink hover:bg-accent-strong mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-extrabold"
          onClick={reset}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Try again
        </button>
      </section>
    </main>
  );
}
