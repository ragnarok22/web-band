import { describe, expect, it } from "vitest";

import { builtInPatterns } from "@/data/patterns";
import type { PatternCategory } from "@/types/pattern";

const requiredCatalog = {
  ballad: ["Slow Ballad"],
  blues: [
    "Straight Blues",
    "Shuffle Blues",
    "Slow 12/8 Blues",
    "Blues Rock",
    "Texas-Style Shuffle-Inspired Practice Groove",
  ],
  country: ["Basic Country", "Train Beat", "Country Ballad", "Country Rock"],
  custom: [
    "Metronome Only",
    "Kick and Snare Only",
    "Hi-Hat Only",
    "Simple 2/4",
    "Simple 3/4",
    "Simple 6/8",
    "Simple 5/4",
    "Simple 7/8",
  ],
  funk: [
    "Basic Sixteenth Funk",
    "Syncopated Funk",
    "Ghost-Note-Inspired Groove",
    "Half-Time Funk",
  ],
  jazz: ["Basic Jazz Ride Practice"],
  latin: [
    "Basic Bossa-Inspired Rhythm",
    "Basic Son-Inspired Practice Groove",
    "Basic Cha-Cha-Inspired Practice Groove",
    "Basic Latin Rock",
  ],
  metal: ["Basic Metal"],
  pop: [
    "Basic Pop",
    "Modern Pop Groove",
    "Dance Pop",
    "Pop Ballad",
    "Syncopated Pop",
  ],
  reggae: ["One Drop", "Steppers", "Rockers", "Basic Reggae Practice Groove"],
  rock: [
    "Basic Rock",
    "Driving Eighths",
    "Four on the Floor",
    "Half-Time Rock",
    "Rock with Open Hi-Hat",
    "Beginner Rock Fill",
    "6/8 Rock Ballad",
  ],
} satisfies Record<PatternCategory, readonly string[]>;

describe("built-in pattern catalog contract", () => {
  it("keeps every required display name in its intended category", () => {
    const expectedNames = Object.values(requiredCatalog).flat();
    expect(expectedNames).toHaveLength(44);

    for (const [category, names] of Object.entries(requiredCatalog)) {
      for (const name of names) {
        const pattern = builtInPatterns.find(
          (candidate) => candidate.name === name,
        );
        expect(
          pattern,
          `${name} is missing from the built-in catalog`,
        ).toBeDefined();
        expect(pattern?.category).toBe(category);
      }
    }

    expect(builtInPatterns.map(({ name }) => name).toSorted()).toEqual(
      expectedNames.toSorted(),
    );
  });
});
