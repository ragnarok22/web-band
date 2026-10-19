import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

import type { CountInMeasures } from "@/types/audio";

interface PracticeNoticesProps {
  countInMeasures: CountInMeasures;
  errorMessage: string | null;
  noticeMessage?: string | null;
  onDismiss: () => void;
  showOnboarding: boolean;
  practiceLabel?: string;
}

export function PracticeNotices({
  countInMeasures,
  errorMessage,
  noticeMessage = null,
  onDismiss,
  showOnboarding,
  practiceLabel = "groove",
}: PracticeNoticesProps) {
  return (
    <>
      {showOnboarding ? (
        <Alert
          className="border-primary/20 bg-primary/7 text-muted-strong flex items-start gap-3 rounded-xl border p-4 text-sm leading-6"
          role="note"
        >
          <Info
            aria-hidden="true"
            className="text-primary mt-0.5 size-5 shrink-0"
          />
          <p className="flex-1">
            Sound begins after you press Play because browsers require a direct
            interaction.{" "}
            {countInMeasures === 0
              ? `The ${practiceLabel} starts immediately.`
              : `You will hear ${countInMeasures === 1 ? "one measure" : `${countInMeasures} measures`} of count-in, then the ${practiceLabel}.`}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss audio tip"
            className="text-muted-foreground hover:bg-surface-hover hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors"
            onClick={onDismiss}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert
          variant="destructive"
          className="border-danger/30 bg-danger/10 p-4"
          role="alert"
        >
          {errorMessage}
        </Alert>
      ) : null}

      {noticeMessage ? (
        <Alert
          aria-live="polite"
          className="border-primary/20 bg-primary/7 text-muted-strong rounded-xl border p-4 text-sm"
          role="status"
        >
          {noticeMessage}
        </Alert>
      ) : null}
    </>
  );
}
