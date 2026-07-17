export type DrumInstrument =
  | "kick"
  | "snare"
  | "closedHat"
  | "openHat"
  | "lowTom"
  | "midTom"
  | "highTom"
  | "crash"
  | "ride"
  | "rim"
  | "clap";

export type PatternDifficulty = "beginner" | "intermediate" | "advanced";

export type PatternCategory =
  | "rock"
  | "pop"
  | "blues"
  | "funk"
  | "reggae"
  | "country"
  | "ballad"
  | "latin"
  | "metal"
  | "jazz"
  | "custom";

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface DrumHit {
  id: string;
  instrument: DrumInstrument;
  step: number;
  velocity: number;
  probability?: number;
  flam?: boolean;
  timingOffset?: number;
}

export interface DrumPattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  difficulty: PatternDifficulty;
  timeSignature: TimeSignature;
  subdivision: 8 | 16;
  bars: number;
  defaultBpm: number;
  recommendedBpmRange: {
    min: number;
    max: number;
  };
  swing?: number;
  hits: DrumHit[];
  isBuiltIn: boolean;
  createdAt?: string;
  updatedAt?: string;
}
