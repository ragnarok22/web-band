import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { visualTimeline } from "@/audio/visual-timeline";
import { BeatVisualizer } from "@/components/practice/beat-visualizer";
import { basicRockPattern } from "@/data/patterns/rock";
import type { DrumPattern } from "@/types/pattern";

const twelveEightPattern: DrumPattern = {
  ...basicRockPattern,
  hits: [],
  id: "twelve-eight-visual-test",
  name: "Twelve eight visual test",
  subdivision: 16,
  timeSignature: { denominator: 8, numerator: 12 },
};

afterEach(() => {
  visualTimeline.reset();
});

describe("BeatVisualizer", () => {
  it("maps canonical sixteenth frames onto the selected visual detail", () => {
    const { container, rerender } = render(
      <BeatVisualizer
        countInMeasures={0}
        detail="pattern"
        pattern={basicRockPattern}
        status="playing"
      />,
    );

    expect(container.querySelectorAll(".beat-step")).toHaveLength(8);
    act(() => {
      visualTimeline.emit({
        isAccent: false,
        measure: 1,
        patternStep: 0,
        phase: "pattern",
        sixteenth: 1,
      });
    });
    expect(container.querySelector('[data-sixteenth="0"]')).toHaveClass(
      "beat-step--active",
    );

    act(() => {
      visualTimeline.emit({
        isAccent: true,
        measure: 1,
        patternStep: 1,
        phase: "pattern",
        sixteenth: 2,
      });
    });
    expect(container.querySelector('[data-sixteenth="0"]')).not.toHaveClass(
      "beat-step--active",
    );
    expect(container.querySelector('[data-sixteenth="2"]')).toHaveClass(
      "beat-step--active",
      "beat-step--accent",
    );

    rerender(
      <BeatVisualizer
        countInMeasures={0}
        detail="beats"
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    expect(container.querySelectorAll(".beat-step")).toHaveLength(4);
    expect(container.querySelector('[data-sixteenth="0"]')).toHaveClass(
      "beat-step--active",
    );

    rerender(
      <BeatVisualizer
        countInMeasures={0}
        detail="sixteenths"
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    expect(container.querySelectorAll(".beat-step")).toHaveLength(16);
    expect(container.querySelector('[data-sixteenth="2"]')).toHaveClass(
      "beat-step--active",
    );
  });

  it("exposes distinct intensity modifiers while retaining standard defaults", () => {
    const { container, rerender } = render(
      <BeatVisualizer
        countInMeasures={1}
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    const visualizer = container.querySelector("section");
    expect(visualizer).toHaveClass("beat-visualizer--standard");
    expect(visualizer).toHaveAttribute("data-detail", "pattern");

    rerender(
      <BeatVisualizer
        countInMeasures={1}
        intensity="minimal"
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    expect(visualizer).toHaveClass("beat-visualizer--minimal");

    rerender(
      <BeatVisualizer
        countInMeasures={1}
        intensity="strong"
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    expect(visualizer).toHaveClass("beat-visualizer--strong");
  });

  it("groups all 24 twelve-eight sixteenths into compact beat cells", () => {
    const { container } = render(
      <BeatVisualizer
        countInMeasures={0}
        detail="sixteenths"
        pattern={twelveEightPattern}
        status="playing"
      />,
    );

    const groups = container.querySelectorAll(".beat-visualizer__group");
    expect(groups).toHaveLength(12);
    expect(container.querySelectorAll(".beat-step")).toHaveLength(24);
    groups.forEach((group) => {
      expect(group.querySelectorAll(".beat-step")).toHaveLength(2);
    });
    expect(container.querySelector(".beat-visualizer__grid")).not.toHaveStyle({
      minWidth: "24rem",
    });
  });

  it("restores the retained playhead after remount and clears it on stop", () => {
    act(() => {
      visualTimeline.emit({
        isAccent: true,
        measure: 3,
        patternStep: 2,
        phase: "pattern",
        sixteenth: 5,
      });
    });

    const first = render(
      <BeatVisualizer
        countInMeasures={0}
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    expect(first.container.querySelector('[data-sixteenth="4"]')).toHaveClass(
      "beat-step--active",
      "beat-step--accent",
    );
    expect(first.container.querySelector("section")).toHaveTextContent(
      "Measure 3",
    );
    first.unmount();

    const second = render(
      <BeatVisualizer
        countInMeasures={0}
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    expect(second.container.querySelector('[data-sixteenth="4"]')).toHaveClass(
      "beat-step--active",
    );

    second.rerender(
      <BeatVisualizer
        countInMeasures={0}
        pattern={basicRockPattern}
        status="stopped"
      />,
    );
    expect(second.container.querySelector(".beat-step--active")).toBeNull();
    expect(second.container.querySelector("section")).toHaveTextContent(
      "Measure 1",
    );
  });

  it("preserves count-in updates and resets them with the timeline", () => {
    const { container } = render(
      <BeatVisualizer
        countInMeasures={2}
        pattern={basicRockPattern}
        status="counting-in"
      />,
    );
    const countIn = container.querySelector(".count-in-display");

    act(() => {
      visualTimeline.emit({
        beat: 2,
        isAccent: false,
        measure: 2,
        phase: "count-in",
      });
    });
    expect(countIn).toHaveTextContent("3");
    expect(countIn).toHaveTextContent("Bar 2 of 2");

    act(() => {
      visualTimeline.reset();
    });
    expect(countIn).toHaveTextContent("1");
    expect(countIn).toHaveTextContent("Bar 1 of 2");
  });
});
