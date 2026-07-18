"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { createPatternShareEnvelope } from "@/lib/pattern-sharing";
import { downloadPatternShareEnvelope } from "@/lib/pattern-sharing-browser";
import type { CustomDrumPattern } from "@/types/persistence";

export function PatternExportButton({
  pattern,
}: {
  pattern: CustomDrumPattern;
}) {
  const [announcement, setAnnouncement] = useState<{
    isError: boolean;
    message: string;
  } | null>(null);

  return (
    <>
      <button
        aria-label={`Export ${pattern.name} pattern`}
        className="border-border text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors"
        onClick={() => {
          try {
            downloadPatternShareEnvelope(createPatternShareEnvelope([pattern]));
            setAnnouncement({
              isError: false,
              message: `${pattern.name} pattern download started.`,
            });
          } catch {
            setAnnouncement({
              isError: true,
              message:
                "Pattern could not be exported. Check your browser download permissions and try again.",
            });
          }
        }}
        title="Export pattern"
        type="button"
      >
        <Download aria-hidden="true" className="size-5" />
      </button>
      <span
        aria-live={announcement?.isError ? "assertive" : "polite"}
        className="sr-only"
        role={announcement?.isError ? "alert" : undefined}
      >
        {announcement?.message}
      </span>
    </>
  );
}
