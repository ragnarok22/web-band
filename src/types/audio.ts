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
export type SoundCharacter = "soft" | "balanced" | "punchy";

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
  stop?(time?: number): void;
  dispose(): void;
}

export interface CountInVisualFrame {
  beat: number;
  isAccent: boolean;
  measure: number;
  phase: "count-in";
}

export interface PatternVisualFrame {
  isAccent: boolean;
  measure: number;
  patternStep: number;
  phase: "pattern";
  sixteenth: number;
}

export type VisualFrame = CountInVisualFrame | PatternVisualFrame;

export interface VisualTimelineListener {
  (frame: VisualFrame | null): void;
}

export type VoiceMap = Partial<Record<DrumInstrument, DrumVoice>>;
