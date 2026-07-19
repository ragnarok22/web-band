import type { DrumInstrument, PatternCategory } from "@/types/pattern";

export type SupportedFillMeter =
  "2/4" | "3/4" | "4/4" | "5/4" | "6/8" | "7/8" | "12/8";

export interface FillHit {
  instrument: DrumInstrument;
  velocity: number;
}

export type FillCell = FillHit[];

export interface FillArrangement {
  compatibility: {
    categories: PatternCategory[];
    meters: SupportedFillMeter[];
  };
  id: string;
  name: string;
  tail: Record<8 | 16, FillCell[]>;
}
