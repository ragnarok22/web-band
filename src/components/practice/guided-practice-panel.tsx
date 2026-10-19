"use client";

import { ChordTrainerPanel } from "@/components/practice/chord-trainer-panel";
import { TempoTrainerPanel } from "@/components/practice/tempo-trainer-panel";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";

export function GuidedPracticePanel({
  sessionDisabled,
}: {
  sessionDisabled: boolean;
}) {
  const mode = useGuidedPracticeStore((state) => state.mode);
  const tempoTrainer = useGuidedPracticeStore((state) => state.tempoTrainer);
  const chordTrainer = useGuidedPracticeStore((state) => state.chordTrainer);
  const setTempoTrainer = useGuidedPracticeStore(
    (state) => state.setTempoTrainerConfiguration,
  );
  const setChordTrainer = useGuidedPracticeStore(
    (state) => state.setChordTrainerConfiguration,
  );

  // Essential trainer setup stays in the workspace, not behind Controls.
  switch (mode) {
    case "drums":
    case "metronome":
    case "strumming":
      return null;
    case "tempoTrainer":
      return (
        <TempoTrainerPanel
          configuration={tempoTrainer}
          disabled={sessionDisabled}
          onChange={setTempoTrainer}
        />
      );
    case "chords":
      return (
        <ChordTrainerPanel
          configuration={chordTrainer}
          disabled={sessionDisabled}
          onChange={setChordTrainer}
        />
      );
  }
}
