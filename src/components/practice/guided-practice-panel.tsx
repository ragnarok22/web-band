"use client";

import { TempoTrainerPanel } from "@/components/practice/tempo-trainer-panel";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";

export function GuidedPracticePanel({
  sessionDisabled,
}: {
  sessionDisabled: boolean;
}) {
  const mode = useGuidedPracticeStore((state) => state.mode);
  const tempoTrainer = useGuidedPracticeStore((state) => state.tempoTrainer);
  const setTempoTrainer = useGuidedPracticeStore(
    (state) => state.setTempoTrainerConfiguration,
  );

  // Essential trainer setup stays in the workspace, not behind Controls.
  switch (mode) {
    case "drums":
    case "metronome":
    case "strumming":
    case "chords":
      return null;
    case "tempoTrainer":
      return (
        <TempoTrainerPanel
          configuration={tempoTrainer}
          disabled={sessionDisabled}
          onChange={setTempoTrainer}
        />
      );
  }
}
