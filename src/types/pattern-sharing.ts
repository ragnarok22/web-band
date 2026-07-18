import type { CustomDrumPattern } from "@/types/persistence";

export interface PatternShareEnvelopeV1 {
  app: "web-band";
  kind: "drum-patterns";
  version: 1;
  exportedAt: string;
  data: {
    patterns: CustomDrumPattern[];
  };
}

export type PatternShareEnvelope = PatternShareEnvelopeV1;

export interface PatternSharePreview {
  byteSize: number;
  envelope: PatternShareEnvelope;
  fileName: string | null;
  patternCount: number;
}

export interface ImportedPattern {
  pattern: CustomDrumPattern;
  resolution: "created" | "copied";
}
