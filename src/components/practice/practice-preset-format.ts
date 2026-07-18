import { builtInPatterns } from "@/data/patterns";
import type { PracticePresetConfiguration } from "@/types/persistence";
import type { PracticeMode } from "@/types/practice";

const modeLabels: Record<PracticeMode, string> = {
  chords: "Chords",
  drums: "Drums",
  strumming: "Strumming",
  tempoTrainer: "Tempo trainer",
};

function titleCaseIdentifier(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function getDrumPatternName(patternId: string): string {
  return (
    builtInPatterns.find(({ id }) => id === patternId)?.name ??
    titleCaseIdentifier(patternId)
  );
}

export function getPracticeModeLabel(mode: PracticeMode): string {
  return modeLabels[mode];
}

export function getPracticePatternSummary(
  configuration: PracticePresetConfiguration,
): string {
  const { guidedPractice } = configuration;

  switch (guidedPractice.mode) {
    case "chords":
      return guidedPractice.chordTrainer.progression.name;
    case "strumming":
      return guidedPractice.strummingPattern.name;
    case "tempoTrainer":
      return `${getDrumPatternName(configuration.patternId)} / ${guidedPractice.tempoTrainer.startBpm}-${guidedPractice.tempoTrainer.endBpm} BPM`;
    case "drums":
      return getDrumPatternName(configuration.patternId);
  }
}

export function getPracticeSetupSummary(
  configuration: PracticePresetConfiguration,
): string {
  return `${getPracticeModeLabel(configuration.guidedPractice.mode)} / ${configuration.bpm} BPM / ${getPracticePatternSummary(configuration)}`;
}
