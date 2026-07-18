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

export type CountInMeasures = 0 | 1 | 2 | 4;
export type FillFrequency = null | 4 | 8 | 16 | "random";

export type MixerGroup =
  "kick" | "snare" | "hiHat" | "toms" | "cymbals" | "percussion";

export interface MixerChannelSettings {
  muted: boolean;
  solo: boolean;
  volume: number;
}

export type MixerSettings = Record<MixerGroup, MixerChannelSettings>;

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
