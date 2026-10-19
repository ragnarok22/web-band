"use client";

import { BeatVisualizer } from "@/components/practice/beat-visualizer";
import { GuidedPracticeDisplay } from "@/components/practice/guided-practice-display";
import { PracticeSessionControls } from "@/components/practice/practice-session-controls";
import { StrummingPatternSelector } from "@/components/practice/strumming-pattern-selector";
import {
  MetronomeControls,
  MetronomePracticeOptions,
} from "@/components/practice/metronome-controls";
import { MetronomeVisualizer } from "@/components/practice/metronome-visualizer";
import type { usePracticeController } from "@/hooks/use-practice-controller";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
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
  const setStrummingPattern = useGuidedPracticeStore(
    (state) => state.setStrummingPattern,
  );
  return (
    <section
      aria-label="Practice player"
      className="practice-player border-border bg-surface min-w-0 rounded-2xl border"
    >
      {practice.guidedPractice.mode === "metronome" ? (
        <>
          <MetronomeControls
            configuration={practice.metronome}
            disabled={!practice.isReady || practice.status === "initializing"}
            active={practice.active}
            onChange={practice.changeMetronome}
          />
          <MetronomeVisualizer
            accentsDisabled={
              !practice.isReady || practice.status === "initializing"
            }
            configuration={practice.metronome}
            status={practice.status}
            countInMeasures={practice.countInMeasures}
            onAccentChange={(index) =>
              practice.changeMetronome({
                ...practice.metronome,
                accentPattern: practice.metronome.accentPattern.map(
                  (accent, beat) => (beat === index ? !accent : accent),
                ),
              })
            }
          />
        </>
      ) : practice.guidedPractice.mode === "strumming" ? (
        <StrummingPatternSelector
          disabled={!practice.isReady || practice.active}
          onChange={setStrummingPattern}
          pattern={practice.guidedPractice.strummingPattern}
          timeSignature={practice.pattern.timeSignature}
        />
      ) : (
        <BeatVisualizer
          embedded
          countInMeasures={practice.countInMeasures}
          detail={visualSubdivisionDetail}
          intensity={beatFlashIntensity}
          pattern={practice.pattern}
          status={practice.status}
        />
      )}
      {practice.guidedPractice.mode !== "drums" &&
      practice.guidedPractice.mode !== "metronome" ? (
        <GuidedPracticeDisplay
          embedded
          configuration={practice.guidedPractice}
          countInMeasures={practice.countInMeasures}
          intensity={beatFlashIntensity}
          status={practice.status}
          timeSignature={practice.pattern.timeSignature}
        />
      ) : null}
      <PracticeSessionControls practice={practice} />
      {practice.guidedPractice.mode === "metronome" ? (
        <MetronomePracticeOptions
          configuration={practice.metronome}
          disabled={!practice.isReady || practice.status === "initializing"}
          active={practice.active}
          onChange={practice.changeMetronome}
        />
      ) : null}
    </section>
  );
}
