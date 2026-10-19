"use client";

import { BeatVisualizer } from "@/components/practice/beat-visualizer";
import { GuidedPracticeDisplay } from "@/components/practice/guided-practice-display";
import { PracticeSessionControls } from "@/components/practice/practice-session-controls";
import type { usePracticeController } from "@/hooks/use-practice-controller";
import type {
  BeatFlashIntensity,
  VisualSubdivisionDetail,
} from "@/types/persistence";

export function PracticePlayer({
  practice,
  beatFlashIntensity,
  visualSubdivisionDetail,
}: {
  practice: ReturnType<typeof usePracticeController>;
  beatFlashIntensity: BeatFlashIntensity;
  visualSubdivisionDetail: VisualSubdivisionDetail;
}) {
  return (
    <section
      aria-label="Practice player"
      className="practice-player border-border bg-surface min-w-0 rounded-2xl border"
    >
      <BeatVisualizer
        embedded
        countInMeasures={practice.countInMeasures}
        detail={visualSubdivisionDetail}
        intensity={beatFlashIntensity}
        pattern={practice.pattern}
        status={practice.status}
      />
      {practice.guidedPractice.mode !== "drums" ? (
        <GuidedPracticeDisplay
          embedded
          configuration={practice.guidedPractice}
          timeSignature={practice.pattern.timeSignature}
        />
      ) : null}
      <PracticeSessionControls practice={practice} />
    </section>
  );
}
