import { describe, expect, it } from "vitest";

import {
  createDefaultStrummingSteps,
  createStrummingPatternDraft,
  resizeStrummingSteps,
} from "@/components/practice/strumming-pattern-editor";
import { downDownUpUpDownUpPattern } from "@/data/strumming-patterns";

describe("strumming pattern editor", () => {
  it("creates complete meter-aware defaults", () => {
    const steps = createDefaultStrummingSteps(
      { denominator: 8, numerator: 6 },
      8,
    );

    expect(steps).toHaveLength(6);
    expect(steps[0]).toEqual({ accent: true, action: "down" });
    expect(steps.slice(1).every(({ action }) => action === "down")).toBe(true);
  });

  it("preserves eighth-note actions at matching sixteenth positions", () => {
    const source = downDownUpUpDownUpPattern.steps.map(
      ({ accent, action }) => ({ accent, action }),
    );
    const resized = resizeStrummingSteps(
      source,
      8,
      16,
      downDownUpUpDownUpPattern.timeSignature,
    );

    expect(resized).toHaveLength(16);
    expect(resized[0]).toEqual(source[0]);
    expect(resized[2]).toEqual(source[1]);
    expect(resized[1]?.action).toBe("hold");
  });

  it("creates detached drafts from persisted patterns", () => {
    const draft = createStrummingPatternDraft(
      downDownUpUpDownUpPattern.timeSignature,
      downDownUpUpDownUpPattern,
    );
    draft.steps[0]!.action = "mute";

    expect(downDownUpUpDownUpPattern.steps[0]?.action).toBe("down");
  });
});
