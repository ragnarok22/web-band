import type { DrumInstrument } from "@/types/pattern";

export type AudioEngineStatus =
  | "not-initialized"
  | "initializing"
  | "ready"
  | "counting-in"
  | "playing"
  | "paused"
  | "stopped"
  | "suspended"
  | "error";

export interface DrumVoice {
  trigger(time: number, velocity?: number): void;
  stop?(): void;
  dispose(): void;
}

export interface ScheduledVisualStep {
  step: number;
  measure: number;
  isAccent: boolean;
  phase: "count-in" | "pattern";
}

export interface VisualTimelineListener {
  (step: ScheduledVisualStep): void;
}

export type VoiceMap = Partial<Record<DrumInstrument, DrumVoice>>;
