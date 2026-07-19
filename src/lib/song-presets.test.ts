import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parsePatternShareText,
  patternShareFileName,
} from "@/lib/pattern-sharing";

const expectedPresets = [
  {
    bpm: 94,
    fileName: "web-band-pattern-ac-dc-back-in-black.json",
    name: "AC/DC - Back in Black",
  },
  {
    bpm: 123,
    fileName: "web-band-pattern-bon-jovi-livin-on-a-prayer.json",
    name: "Bon Jovi - Livin' on a Prayer",
  },
  {
    bpm: 119,
    fileName: "web-band-pattern-journey-don-t-stop-believin.json",
    name: "Journey - Don't Stop Believin'",
  },
  {
    bpm: 97,
    fileName: "web-band-pattern-mana-en-el-muelle-de-san-blas.json",
    name: "Mana - En el muelle de San Blas",
  },
  {
    bpm: 117,
    fileName: "web-band-pattern-michael-jackson-billie-jean.json",
    name: "Michael Jackson - Billie Jean",
  },
  {
    bpm: 117,
    fileName: "web-band-pattern-nirvana-smells-like-teen-spirit.json",
    name: "Nirvana - Smells Like Teen Spirit",
  },
  {
    bpm: 110,
    fileName: "web-band-pattern-queen-another-one-bites-the-dust.json",
    name: "Queen - Another One Bites the Dust",
  },
  {
    bpm: 81,
    fileName: "web-band-pattern-queen-we-will-rock-you.json",
    name: "Queen - We Will Rock You",
  },
  {
    bpm: 117,
    fileName: "web-band-pattern-the-police-every-breath-you-take.json",
    name: "The Police - Every Breath You Take",
  },
  {
    bpm: 124,
    fileName: "web-band-pattern-the-white-stripes-seven-nation-army.json",
    name: "The White Stripes - Seven Nation Army",
  },
] as const;

describe("committed song presets", () => {
  it("contains ten directly importable, uniquely identified patterns", () => {
    const presetsDirectory = join(process.cwd(), "presets");
    const files = readdirSync(presetsDirectory)
      .filter((fileName) => fileName.endsWith(".json"))
      .sort();
    const expectedFiles = expectedPresets
      .map(({ fileName }) => fileName)
      .sort();
    const patternIds = new Set<string>();

    expect(files).toEqual(expectedFiles);

    for (const expected of expectedPresets) {
      const text = readFileSync(
        join(presetsDirectory, expected.fileName),
        "utf8",
      );
      const preview = parsePatternShareText(text, expected.fileName);
      const pattern = preview.envelope.data.patterns[0];

      expect(preview.patternCount).toBe(1);
      expect(patternShareFileName(preview.envelope)).toBe(expected.fileName);
      expect(pattern).toMatchObject({
        defaultBpm: expected.bpm,
        isBuiltIn: false,
        name: expected.name,
      });
      expect(patternIds.has(pattern!.id)).toBe(false);
      patternIds.add(pattern!.id);
    }
  });
});
