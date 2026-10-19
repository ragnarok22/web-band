import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { visualTimeline } from "@/audio/visual-timeline";
import { strumActionDetails } from "@/components/practice/strum-action-details";
import { StrummingPracticeView } from "@/components/practice/strumming-practice-view";
import {
  basicPopPattern,
  basicSixEightPattern,
} from "@/data/strumming-patterns";
import { getStrumPosition } from "@/lib/guided-practice";
import type { AudioEngineStatus } from "@/types/audio";
import type {
  GuidanceFrame,
  StrumAction,
  StrummingPattern,
} from "@/types/practice";

function frameFor(
  absoluteSixteenth: number,
  pattern = basicPopPattern,
): Extract<GuidanceFrame, { mode: "strumming" }> {
  return {
    absoluteSixteenth,
    elapsedSeconds: absoluteSixteenth / 8,
    measure: 1,
    mode: "strumming",
    position: getStrumPosition(pattern, absoluteSixteenth),
  };
}

const defaults = {
  pattern: basicPopPattern,
  snapshot: null,
  timeSignature: basicPopPattern.timeSignature,
};

beforeEach(() => visualTimeline.reset());
afterEach(() => visualTimeline.reset());

describe("StrummingPracticeView", () => {
  it.each<StrumAction>(["down", "up", "mute", "rest", "hold"])(
    "explains the current %s action and shows its distinct symbol",
    (action) => {
      const index = basicPopPattern.steps.findIndex(
        (step) => step.action === action,
      );
      const { container } = render(
        <StrummingPracticeView
          {...defaults}
          snapshot={frameFor(index)}
          status="playing"
        />,
      );
      const cue = within(screen.getByRole("group", { name: "Current action" }));
      const details = strumActionDetails[action];
      expect(cue.getByText(details.label)).toBeVisible();
      expect(cue.getByText(details.symbol)).toBeVisible();
      expect(cue.getByText(details.guidance)).toBeVisible();
      expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(
        1,
      );
      expect(container.querySelector('[aria-current="step"]')).toHaveAttribute(
        "data-action",
        action,
      );
      expect(container.querySelector("[aria-live]")).toBeNull();
    },
  );

  it("wraps the next action and its explicit accent to the first step", () => {
    render(
      <StrummingPracticeView
        {...defaults}
        snapshot={frameFor(15)}
        status="playing"
      />,
    );
    const current = within(
      screen.getByRole("group", { name: "Current action" }),
    );
    const next = within(screen.getByRole("group", { name: "Next action" }));
    expect(current.getByText("Up")).toBeVisible();
    expect(current.queryByText("Accent")).not.toBeInTheDocument();
    expect(next.getByText("Down")).toBeVisible();
    expect(next.getByText("Accent")).toBeVisible();
    expect(next.getByText(">")).toBeVisible();
  });

  it("reserves accent and guidance slots across action changes without announcing a missing accent", () => {
    const { rerender } = render(
      <StrummingPracticeView
        {...defaults}
        snapshot={frameFor(0)}
        status="playing"
      />,
    );
    const current = screen.getByRole("group", { name: "Current action" });
    const next = screen.getByRole("group", { name: "Next action" });
    const slot = current.querySelector('[class*="accentSlot"]');
    const nextSlot = next.querySelector('[class*="accentSlot"]');
    expect(slot).toBeInTheDocument();
    expect(nextSlot).toBeInTheDocument();
    expect(within(current).getByText("Accent")).toBeVisible();
    expect(within(next).getByText("Next:")).toBeVisible();
    expect(within(next).queryByText("Next action")).not.toBeInTheDocument();
    for (const index of [1, 2, 3, 4, 0]) {
      rerender(
        <StrummingPracticeView
          {...defaults}
          snapshot={frameFor(index)}
          status="playing"
        />,
      );
      expect(current.querySelector('[class*="accentSlot"]')).toBe(slot);
      expect(next.querySelector('[class*="accentSlot"]')).toBe(nextSlot);
      if (index !== 0) {
        expect(within(current).queryByText("Accent")).not.toBeInTheDocument();
        expect(slot).toBeEmptyDOMElement();
      }
    }
  });

  it("uses a nonduplicated timeline heading and a touch-sized help target", () => {
    render(<StrummingPracticeView {...defaults} />);
    expect(screen.getByText("Follow the pattern")).toBeVisible();
    expect(screen.queryByText("4/4 · Sixteenth notes")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Symbol help" })).toHaveClass(
      "min-h-11",
    );
  });

  it("retains current and next previews on pause or suspension but not a playing highlight", () => {
    const snapshot = frameFor(4);
    const { container, rerender } = render(
      <StrummingPracticeView
        {...defaults}
        snapshot={snapshot}
        status="playing"
      />,
    );
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
    for (const status of ["paused", "suspended"] as const) {
      rerender(
        <StrummingPracticeView
          {...defaults}
          snapshot={snapshot}
          status={status}
        />,
      );
      expect(container.querySelector("[aria-current]")).toBeNull();
      expect(
        within(screen.getByRole("group", { name: "Current action" })).getByText(
          "Mute",
        ),
      ).toBeVisible();
      expect(
        within(screen.getByRole("group", { name: "Next action" })).getByText(
          "Hold",
        ),
      ).toBeVisible();
    }
    rerender(
      <StrummingPracticeView
        {...defaults}
        snapshot={snapshot}
        status="playing"
      />,
    );
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it.each<AudioEngineStatus>([
    "stopped",
    "not-initialized",
    "initializing",
    "ready",
    "error",
  ])("resets stale previews and highlights when %s", (status) => {
    const { container } = render(
      <StrummingPracticeView
        {...defaults}
        snapshot={frameFor(4)}
        status={status}
      />,
    );
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Down",
      ),
    ).toBeVisible();
    expect(container.querySelector("[aria-current]")).toBeNull();
  });

  it("has no active step before the first frame or after a timeline reset", () => {
    const { container, rerender } = render(
      <StrummingPracticeView {...defaults} status="playing" />,
    );
    expect(container.querySelector("[aria-current]")).toBeNull();
    rerender(
      <StrummingPracticeView
        {...defaults}
        snapshot={frameFor(4)}
        status="playing"
      />,
    );
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
    rerender(<StrummingPracticeView {...defaults} status="playing" />);
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Down",
      ),
    ).toBeVisible();
  });

  it("uses retained count-in frames on the same timeline, never a strumming playhead", () => {
    visualTimeline.emit({
      beat: 2,
      isAccent: false,
      measure: 2,
      phase: "count-in",
    });
    const { container, rerender } = render(
      <StrummingPracticeView
        {...defaults}
        countInMeasures={2}
        snapshot={frameFor(4)}
        status="counting-in"
      />,
    );
    const cue = within(screen.getByRole("group", { name: "Current action" }));
    expect(cue.getByText("Count in")).toBeVisible();
    expect(cue.getByText("3")).toBeVisible();
    expect(cue.getByText("Listen, then start on 1. Bar 2 of 2.")).toBeVisible();
    expect(
      within(screen.getByRole("group", { name: "Next action" })).getByText(
        "Down",
      ),
    ).toBeVisible();
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(container.querySelectorAll('[data-count-in="true"]')).toHaveLength(
      4,
    );
    expect(
      screen.getAllByRole("list", { name: /action sequence/ }),
    ).toHaveLength(1);
    expect(container.querySelector("[aria-live]")).toBeNull();
    act(() =>
      visualTimeline.emit({
        beat: 3,
        isAccent: false,
        measure: 2,
        phase: "count-in",
      }),
    );
    expect(cue.getByText("4")).toBeVisible();
    expect(container.querySelector('[data-count-in="true"]')).toHaveAttribute(
      "data-beat",
      "4",
    );

    rerender(
      <StrummingPracticeView
        {...defaults}
        countInMeasures={2}
        snapshot={frameFor(4)}
        status="playing"
      />,
    );
    expect(screen.queryByText("Count in")).not.toBeInTheDocument();
    expect(container.querySelector('[data-count-in="true"]')).toBeNull();
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("does not invent count-in beats or read pattern frames as count-in frames", () => {
    const { container } = render(
      <StrummingPracticeView
        {...defaults}
        countInMeasures={1}
        status="counting-in"
      />,
    );
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Ready",
      ),
    ).toBeVisible();
    act(() =>
      visualTimeline.emit({
        isAccent: true,
        measure: 1,
        patternStep: 0,
        phase: "pattern",
        sixteenth: 0,
      }),
    );
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Ready",
      ),
    ).toBeVisible();
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(container.querySelector('[data-count-in="true"]')).toBeNull();
  });

  it("uses the actual 6/8 beat for count-in and rejects out-of-meter frames", () => {
    visualTimeline.emit({
      beat: 5,
      isAccent: false,
      measure: 1,
      phase: "count-in",
    });
    const { container } = render(
      <StrummingPracticeView
        {...defaults}
        countInMeasures={1}
        pattern={basicSixEightPattern}
        timeSignature={basicSixEightPattern.timeSignature}
        status="counting-in"
      />,
    );
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "6",
      ),
    ).toBeVisible();
    expect(container.querySelectorAll('[data-count-in="true"]')).toHaveLength(
      1,
    );
    act(() =>
      visualTimeline.emit({
        beat: 6,
        isAccent: false,
        measure: 1,
        phase: "count-in",
      }),
    );
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Ready",
      ),
    ).toBeVisible();
    expect(container.querySelector('[data-count-in="true"]')).toBeNull();
  });

  it.each([
    "mode",
    "current step",
    "next step",
    "action",
    "accent",
    "index",
    "time",
    "meter",
  ])("ignores a retained frame with a mismatched %s", (mismatch) => {
    const original = frameFor(4);
    let snapshot: GuidanceFrame = original;
    let timeSignature = defaults.timeSignature;
    switch (mismatch) {
      case "mode":
        snapshot = {
          absoluteSixteenth: 4,
          elapsedSeconds: 1,
          measure: 1,
          mode: "drums",
        };
        break;
      case "current step":
        snapshot = {
          ...original,
          position: { ...original.position, currentStepId: "old-pattern" },
        };
        break;
      case "next step":
        snapshot = {
          ...original,
          position: { ...original.position, nextStepId: "old-pattern" },
        };
        break;
      case "action":
        snapshot = {
          ...original,
          position: { ...original.position, currentAction: "down" },
        };
        break;
      case "accent":
        snapshot = {
          ...original,
          position: { ...original.position, accent: true },
        };
        break;
      case "index":
        snapshot = {
          ...original,
          position: { ...original.position, stepIndex: 0 },
        };
        break;
      case "time":
        snapshot = { ...original, absoluteSixteenth: -1 };
        break;
      case "meter":
        timeSignature = { denominator: 4, numerator: 3 };
        break;
    }
    const { container } = render(
      <StrummingPracticeView
        {...defaults}
        snapshot={snapshot}
        timeSignature={timeSignature}
        status="playing"
      />,
    );
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Down",
      ),
    ).toBeVisible();
  });

  it("does not carry old step ids across a pattern switch", () => {
    const { container, rerender } = render(
      <StrummingPracticeView
        {...defaults}
        snapshot={frameFor(4)}
        status="playing"
      />,
    );
    const pattern: StrummingPattern = {
      ...basicPopPattern,
      id: "new-pattern",
      steps: basicPopPattern.steps.map((step) => ({
        ...step,
        id: `new-${step.id}`,
      })),
    };
    rerender(
      <StrummingPracticeView
        {...defaults}
        pattern={pattern}
        snapshot={frameFor(4)}
        status="playing"
      />,
    );
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Down",
      ),
    ).toBeVisible();
  });

  it("offers all five symbol meanings and accent help by keyboard", async () => {
    const user = userEvent.setup();
    render(<StrummingPracticeView {...defaults} />);
    const button = screen.getByRole("button", { name: "Symbol help" });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    const help = screen.getByRole("dialog", { name: "Strumming symbols" });
    for (const details of Object.values(strumActionDetails)) {
      expect(within(help).getByText(details.label)).toBeVisible();
      expect(within(help).getByText(details.guidance)).toBeVisible();
      expect(within(help).getByText(details.symbol)).toBeVisible();
    }
    expect(within(help).getByText("> Accent")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("opens symbol help with a touch interaction", async () => {
    const user = userEvent.setup();
    render(<StrummingPracticeView {...defaults} />);
    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Symbol help" }),
    });
    expect(
      screen.getByRole("dialog", { name: "Strumming symbols" }),
    ).toBeVisible();
  });
});
