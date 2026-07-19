import { describe, expect, it } from "vitest";

import { soundCharacterProfiles } from "@/audio/synthesis/sound-profiles";

describe("sound character profiles", () => {
  it("preserves the existing synthesis and mix as Balanced", () => {
    expect(soundCharacterProfiles.balanced).toEqual({
      clickTrim: 0.9,
      compressor: {
        attack: 0.003,
        knee: 12,
        ratio: 5,
        release: 0.16,
        threshold: -8,
      },
      synthesis: { attack: 1, brightness: 1, decay: 1, gain: 1 },
      trims: {
        cymbals: 0.72,
        hiHat: 0.8,
        kick: 0.95,
        percussion: 0.76,
        snare: 0.75,
        toms: 0.82,
      },
    });
  });

  it("defines complete, positive synthesis profiles for every character", () => {
    expect(Object.keys(soundCharacterProfiles)).toEqual([
      "soft",
      "balanced",
      "punchy",
    ]);
    for (const profile of Object.values(soundCharacterProfiles)) {
      expect(Object.values(profile.synthesis).every((value) => value > 0)).toBe(
        true,
      );
      expect(Object.values(profile.trims).every((value) => value > 0)).toBe(
        true,
      );
    }
  });
});
