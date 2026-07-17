import { bluesPatterns } from "@/data/patterns/blues";
import { countryPatterns } from "@/data/patterns/country";
import { funkPatterns } from "@/data/patterns/funk";
import { latinPatterns } from "@/data/patterns/latin";
import { popPatterns } from "@/data/patterns/pop";
import { reggaePatterns } from "@/data/patterns/reggae";
import { basicRockPattern, rockPatterns } from "@/data/patterns/rock";
import { utilityPatterns } from "@/data/patterns/utility";
import type { DrumPattern } from "@/types/pattern";

export { basicRockPattern } from "@/data/patterns/rock";

export const builtInPatterns: readonly DrumPattern[] = [
  ...rockPatterns,
  ...popPatterns,
  ...bluesPatterns,
  ...funkPatterns,
  ...reggaePatterns,
  ...countryPatterns,
  ...latinPatterns,
  ...utilityPatterns,
];

export function getBuiltInPattern(patternId: string): DrumPattern {
  return (
    builtInPatterns.find((pattern) => pattern.id === patternId) ??
    basicRockPattern
  );
}

export function getPatternById(
  patternId: string,
  customPatterns: readonly DrumPattern[] = [],
): DrumPattern {
  return (
    customPatterns.find((pattern) => pattern.id === patternId) ??
    getBuiltInPattern(patternId)
  );
}
