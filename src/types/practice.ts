import type { TimeSignature } from "@/types/pattern";

export type PracticeMode = "drums" | "tempoTrainer" | "chords" | "strumming";

export type TempoTrainerInterval =
  | {
      type: "measures";
      measures: number;
    }
  | {
      type: "seconds";
      seconds: number;
    };

export interface TempoTrainerConfiguration {
  startBpm: number;
  endBpm: number;
  increment: number;
  interval: TempoTrainerInterval;
  stopAtTarget: boolean;
  resetToStartingBpmOnStop: boolean;
}

export interface ChordStep {
  id: string;
  chord: string;
  duration: number;
  durationUnit: "beats" | "measures";
}

export interface ChordProgression {
  id: string;
  name: string;
  steps: ChordStep[];
  isBuiltIn: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChordTrainerConfiguration {
  progression: ChordProgression;
  repeat: boolean;
  showCountdown: boolean;
}

export type StrumAction = "down" | "up" | "mute" | "rest" | "hold";

export interface StrumStep {
  id: string;
  subdivisionIndex: number;
  action: StrumAction;
  accent?: boolean;
}

export interface StrummingPattern {
  id: string;
  name: string;
  timeSignature: TimeSignature;
  subdivision: 8 | 16;
  steps: StrumStep[];
  isBuiltIn: boolean;
}

export type GuidedPracticeConfiguration =
  | {
      mode: "drums";
    }
  | {
      mode: "tempoTrainer";
      tempoTrainer: TempoTrainerConfiguration;
    }
  | {
      mode: "chords";
      chordTrainer: ChordTrainerConfiguration;
    }
  | {
      mode: "strumming";
      strummingPattern: StrummingPattern;
    };

export interface TempoTrainerPosition {
  currentBpm: number;
  nextBpm: number | null;
  progress: number;
  completedIntervals: number;
  measuresUntilChange: number | null;
  secondsUntilChange: number | null;
  isAtTarget: boolean;
  shouldStop: boolean;
}

export interface ChordTrainerPosition {
  currentStepIndex: number | null;
  currentStepId: string | null;
  currentChord: string | null;
  nextStepId: string | null;
  nextChord: string | null;
  countdown: number | null;
  cycle: number;
  sixteenthsIntoStep: number;
  sixteenthsRemaining: number;
  isComplete: boolean;
}

export interface StrumPosition {
  stepIndex: number;
  currentStepId: string;
  currentAction: StrumAction;
  nextStepId: string;
  nextAction: StrumAction;
  accent: boolean;
  isStepBoundary: boolean;
}

interface GuidanceFrameBase {
  absoluteSixteenth: number;
  elapsedSeconds: number;
  measure: number;
}

export type GuidanceFrame =
  | (GuidanceFrameBase & {
      mode: "drums";
    })
  | (GuidanceFrameBase & {
      mode: "tempoTrainer";
      position: TempoTrainerPosition;
    })
  | (GuidanceFrameBase & {
      mode: "chords";
      position: ChordTrainerPosition;
    })
  | (GuidanceFrameBase & {
      mode: "strumming";
      position: StrumPosition;
    });
