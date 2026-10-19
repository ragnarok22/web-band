"use client";

import { ChordTrainerPanel } from "@/components/practice/chord-trainer-panel";
import { StrummingTrainerPanel } from "@/components/practice/strumming-trainer-panel";
import { TempoTrainerPanel } from "@/components/practice/tempo-trainer-panel";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import type { TimeSignature } from "@/types/pattern";

export function GuidedPracticePanel({
  activeTimeSignature,
  sessionDisabled,
}: {
  activeTimeSignature: TimeSignature;
  sessionDisabled: boolean;
}) {
  const mode = useGuidedPracticeStore((state) => state.mode);
  const tempoTrainer = useGuidedPracticeStore((state) => state.tempoTrainer);
  const chordTrainer = useGuidedPracticeStore((state) => state.chordTrainer);
  const strummingPattern = useGuidedPracticeStore(
    (state) => state.strummingPattern,
  );
  const setTempoTrainer = useGuidedPracticeStore(
    (state) => state.setTempoTrainerConfiguration,
  );
  const setChordTrainer = useGuidedPracticeStore(
    (state) => state.setChordTrainerConfiguration,
  );
  const setStrummingPattern = useGuidedPracticeStore(
    (state) => state.setStrummingPattern,
  );

  // Essential trainer setup stays in the workspace, not behind Controls.
  switch (mode) {
    case "drums":
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
    case "strumming":
      return (
        <StrummingTrainerPanel
          disabled={sessionDisabled}
          onChange={setStrummingPattern}
          pattern={strummingPattern}
          timeSignature={activeTimeSignature}
        />
      );
  }
}
