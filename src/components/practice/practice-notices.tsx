import { Info, X } from "lucide-react";

import type { CountInMeasures } from "@/types/audio";

interface PracticeNoticesProps {
  countInMeasures: CountInMeasures;
  errorMessage: string | null;
  noticeMessage?: string | null;
  onDismiss: () => void;
  showOnboarding: boolean;
}

export function PracticeNotices({
  countInMeasures,
  errorMessage,
  noticeMessage = null,
  onDismiss,
  showOnboarding,
}: PracticeNoticesProps) {
  return (
    <>
      {showOnboarding ? (
        <aside
          className="border-accent/20 bg-accent/7 text-muted-strong flex items-start gap-3 rounded-xl border p-4 text-sm leading-6"
          role="note"
        >
          <Info
            aria-hidden="true"
            className="text-accent mt-0.5 size-5 shrink-0"
          />
          <p className="flex-1">
            Sound begins after you press Play because browsers require a direct
            interaction.{" "}
            {countInMeasures === 0
              ? "The groove starts immediately."
              : `You will hear ${countInMeasures === 1 ? "one measure" : `${countInMeasures} measures`} of count-in, then the groove.`}
          </p>
          <button
            aria-label="Dismiss audio tip"
            className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors"
            onClick={onDismiss}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </aside>
      ) : null}

      {errorMessage ? (
        <p
          className="border-danger/30 bg-danger/10 text-foreground rounded-xl border p-4 text-sm"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {noticeMessage ? (
        <p
          aria-live="polite"
          className="border-accent/20 bg-accent/7 text-muted-strong rounded-xl border p-4 text-sm"
          role="status"
        >
          {noticeMessage}
        </p>
      ) : null}
    </>
  );
}
