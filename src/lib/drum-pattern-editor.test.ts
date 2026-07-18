import { describe, expect, it } from "vitest";

import { basicRockPattern } from "@/data/patterns";
import {
  clearPattern,
  clearPatternRow,
  copyPatternMeasure,
  createDefaultPatternDraft,
  cyclePatternCell,
  duplicatePatternDraft,
  pastePatternMeasure,
  resizePatternDraft,
  togglePatternCell,
  updateAdvancedHit,
} from "@/lib/drum-pattern-editor";
import { validateCustomDrumPattern } from "@/lib/persistence-validation";

const timestamp = "2026-07-18T12:00:00.000Z";

describe("drum pattern editor helpers", () => {
  it("creates a valid default draft with a collision-safe ID", () => {
    const ids = ["collision", "available"];
    const draft = createDefaultPatternDraft(["custom-collision"], {
      createId: () => ids.shift()!,
      now: () => timestamp,
    });

    expect(draft.id).toBe("custom-available");
    expect(validateCustomDrumPattern(draft).success).toBe(true);
    expect(draft.hits).toEqual([]);
  });

  it("duplicates with fresh pattern and hit IDs after collisions", () => {
    const source = {
      ...structuredClone(basicRockPattern),
      hits: [
        {
          id: "hit-collision",
          instrument: "kick" as const,
          step: 0,
          velocity: 1,
        },
      ],
    };
    const generated = [
      "collision",
      "fresh-hit",
      "pattern-collision",
      "fresh-pattern",
    ];
    const duplicate = duplicatePatternDraft(
      source,
      ["custom-pattern-collision"],
      {
        createId: () => generated.shift() ?? crypto.randomUUID(),
        now: () => timestamp,
      },
    );

    expect(duplicate.id).toBe("custom-fresh-pattern");
    expect(duplicate.hits[0]?.id).toBe("hit-fresh-hit");
    expect(duplicate.name).toBe("Basic Rock copy");
    expect(duplicate.createdAt).toBe(timestamp);
    expect(duplicate.hits.map(({ id }) => id)).not.toEqual(
      source.hits.map(({ id }) => id),
    );
    expect(new Set(duplicate.hits.map(({ id }) => id)).size).toBe(
      duplicate.hits.length,
    );
    expect(validateCustomDrumPattern(duplicate).success).toBe(true);
  });

  it("resizes hits with the subdivision and removes out-of-range hits", () => {
    const draft = duplicatePatternDraft(basicRockPattern, [], {
      createId: () => crypto.randomUUID(),
      now: () => timestamp,
    });
    const sixteenths = resizePatternDraft(draft, { subdivision: 16 });
    expect(sixteenths.hits.map(({ step }) => step)).toEqual(
      draft.hits.map(({ step }) => step * 2),
    );

    const long = resizePatternDraft(sixteenths, { bars: 2 });
    long.hits.push({
      id: "second-measure-hit",
      instrument: "kick",
      step: 20,
      velocity: 1,
    });
    expect(resizePatternDraft(long, { bars: 1 }).hits).not.toContainEqual(
      expect.objectContaining({ id: "second-measure-hit" }),
    );
  });

  it("cycles and toggles a cell without mutating its input", () => {
    const original = createDefaultPatternDraft([], { now: () => timestamp });
    const first = cyclePatternCell(original, "kick", 0, () => "one");
    const second = cyclePatternCell(first, "kick", 0);
    const third = cyclePatternCell(second, "kick", 0);
    const empty = cyclePatternCell(third, "kick", 0);

    expect(original.hits).toEqual([]);
    expect(first.hits[0]?.velocity).toBe(0.7);
    expect(second.hits[0]?.velocity).toBe(0.85);
    expect(third.hits[0]?.velocity).toBe(1);
    expect(empty.hits).toEqual([]);
    expect(
      togglePatternCell(empty, "snare", 2, () => "two").hits[0],
    ).toMatchObject({ instrument: "snare", step: 2, velocity: 0.85 });
  });

  it("clears a row or the whole pattern", () => {
    const draft = duplicatePatternDraft(basicRockPattern, [], {
      now: () => timestamp,
    });
    const noKick = clearPatternRow(draft, "kick");
    expect(noKick.hits.some(({ instrument }) => instrument === "kick")).toBe(
      false,
    );
    expect(noKick.hits.some(({ instrument }) => instrument === "snare")).toBe(
      true,
    );
    expect(clearPattern(noKick).hits).toEqual([]);
  });

  it("copies a measure and pastes it by clearing the target first", () => {
    let draft = duplicatePatternDraft(basicRockPattern, [], {
      now: () => timestamp,
    });
    draft = resizePatternDraft(draft, { bars: 2 });
    draft.hits.push({
      id: "target-hit",
      instrument: "clap",
      step: 8,
      velocity: 1,
    });
    const clipboard = copyPatternMeasure(draft, 0);
    const pasted = pastePatternMeasure(draft, 1, clipboard);

    expect(pasted.hits.some(({ id }) => id === "target-hit")).toBe(false);
    expect(pasted.hits.filter(({ step }) => step >= 8)).toHaveLength(
      clipboard.hits.length,
    );
    expect(
      pasted.hits.filter(({ step }) => step >= 8).map(({ id }) => id),
    ).not.toEqual(
      draft.hits.filter(({ step }) => step < 8).map(({ id }) => id),
    );
  });

  it("creates and clamps advanced hit properties", () => {
    const draft = createDefaultPatternDraft([], { now: () => timestamp });
    const updated = updateAdvancedHit(
      draft,
      "rim",
      3,
      { flam: true, probability: 2, timingOffset: -1, velocity: 1.5 },
      () => "advanced",
    );
    expect(updated.hits[0]).toMatchObject({
      flam: true,
      probability: 1,
      timingOffset: -0.1,
      velocity: 1,
    });
  });
});
