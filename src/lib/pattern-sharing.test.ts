import { describe, expect, it } from "vitest";

import {
  createPatternShareEnvelope,
  MAX_PATTERN_SHARE_FILE_BYTES,
  parsePatternShareText,
  patternShareFileName,
  serializePatternShareEnvelope,
  validatePatternShareEnvelope,
} from "@/lib/pattern-sharing";
import type { CustomDrumPattern } from "@/types/persistence";

function pattern(
  id = "shared-pocket",
  name = "Shared Pocket",
): CustomDrumPattern {
  return {
    bars: 1,
    category: "rock",
    createdAt: "2026-07-18T12:00:00.000Z",
    defaultBpm: 96,
    description: "A portable backbeat.",
    difficulty: "beginner",
    hits: [{ id: `${id}-kick`, instrument: "kick", step: 0, velocity: 0.85 }],
    id,
    isBuiltIn: false,
    name,
    recommendedBpmRange: { max: 130, min: 70 },
    subdivision: 16,
    timeSignature: { denominator: 4, numerator: 4 },
    updatedAt: "2026-07-18T12:00:00.000Z",
  };
}

describe("pattern sharing envelope", () => {
  it("round-trips a detached versioned pattern bundle", () => {
    const source = pattern();
    const envelope = createPatternShareEnvelope(
      [source],
      new Date("2026-07-18T12:34:56.789Z"),
    );
    source.name = "Changed later";

    expect(envelope).toMatchObject({
      app: "web-band",
      exportedAt: "2026-07-18T12:34:56.789Z",
      kind: "drum-patterns",
      version: 1,
    });
    expect(envelope.data.patterns[0]?.name).toBe("Shared Pocket");
    expect(patternShareFileName(envelope)).toBe(
      "web-band-pattern-shared-pocket.json",
    );

    const text = serializePatternShareEnvelope(envelope);
    const preview = parsePatternShareText(text, "friend-grooves.json");
    expect(preview).toMatchObject({
      fileName: "friend-grooves.json",
      patternCount: 1,
    });
    expect(preview.envelope).toEqual(envelope);
  });

  it("names multi-pattern bundles by export date", () => {
    const envelope = createPatternShareEnvelope(
      [pattern("one"), pattern("two")],
      new Date("2026-07-18T12:00:00.000Z"),
    );
    expect(patternShareFileName(envelope)).toBe(
      "web-band-patterns-2026-07-18.json",
    );
  });

  it("rejects malformed, unsupported, duplicate, and built-in pattern files", () => {
    expect(() => parsePatternShareText("not-json")).toThrow(/valid JSON/i);
    const envelope = createPatternShareEnvelope([pattern()]);
    expect(validatePatternShareEnvelope({ ...envelope, version: 2 })).toContain(
      "Pattern file version is unsupported.",
    );
    expect(
      validatePatternShareEnvelope({
        ...envelope,
        data: { patterns: [pattern(), pattern()] },
      }),
    ).toContain("Shared pattern IDs must be unique.");
    expect(
      validatePatternShareEnvelope({
        ...envelope,
        data: {
          patterns: [{ ...pattern(), id: "basic-rock" }],
        },
      }).join(" "),
    ).toMatch(/built-in pattern/i);
  });

  it("enforces the pattern-share byte limit before JSON parsing", () => {
    expect(() =>
      parsePatternShareText("x".repeat(MAX_PATTERN_SHARE_FILE_BYTES + 1)),
    ).toThrow(/larger than/i);
  });
});
