import { act, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { visualTimeline } from "@/audio/visual-timeline";
import { RhythmPreview } from "@/components/patterns/rhythm-preview";
import { basicRockPattern, builtInPatterns } from "@/data/patterns";
import type { DrumPattern } from "@/types/pattern";

function tick(patternStep: number, measure = 1) {
  act(() =>
    visualTimeline.emit({
      isAccent: false,
      measure,
      patternStep,
      phase: "pattern",
      sixteenth: patternStep * 2,
    }),
  );
}

function activeCells(container: HTMLElement) {
  return container.querySelectorAll('[data-rhythm-cell][data-active="true"]');
}

describe("library rhythm preview", () => {
  beforeEach(() => visualTimeline.reset());
  afterEach(() => {
    visualTimeline.reset();
    vi.restoreAllMocks();
  });

  it("marks main beats and distinguishes rests, soft hits, and accents without changing pattern data", () => {
    const original = structuredClone(basicRockPattern);
    const { container } = render(<RhythmPreview pattern={basicRockPattern} />);
    expect(container.querySelectorAll("[data-beat-label]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-rhythm-cell]")).toHaveLength(24);
    expect(
      container.querySelectorAll('[data-rhythm-cell][data-hit="true"]'),
    ).toHaveLength(12);
    expect(
      container.querySelectorAll('[data-rhythm-cell][data-accent="true"]'),
    ).toHaveLength(4);
    expect(screen.getByText("Top")).toBeVisible();
    expect(screen.getByText("Backbeat")).toBeVisible();
    expect(screen.getByText("Kick")).toBeVisible();
    expect(basicRockPattern).toEqual(original);
  });

  it("groups compound-meter pulses in threes", () => {
    const pattern = builtInPatterns.find(
      ({ id }) => id === "six-eight-rock-ballad",
    )!;
    const { container } = render(<RhythmPreview pattern={pattern} />);
    expect(container.querySelectorAll("[data-beat-label]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-rhythm-cell]")).toHaveLength(18);
  });

  it("follows the existing audio timeline only on the active card without per-tick React renders", () => {
    const onRender = vi.fn();
    const { container, rerender } = render(
      <Profiler id="preview" onRender={onRender}>
        <RhythmPreview
          isPreviewing
          pattern={basicRockPattern}
          status="playing"
        />
      </Profiler>,
    );
    onRender.mockClear();
    tick(2);
    expect(activeCells(container)).toHaveLength(3);
    expect(
      [...activeCells(container)].every(
        (cell) => cell.getAttribute("data-step") === "2",
      ),
    ).toBe(true);
    tick(3);
    expect(activeCells(container)).toHaveLength(3);
    expect(
      [...activeCells(container)].every(
        (cell) => cell.getAttribute("data-step") === "3",
      ),
    ).toBe(true);
    expect(onRender).not.toHaveBeenCalled();
    rerender(<RhythmPreview isPreviewing={false} pattern={basicRockPattern} />);
    tick(4);
    expect(activeCells(container)).toHaveLength(0);
  });

  it("does not animate during count-in or when playback is suspended and clears on timeline reset", () => {
    const { container, rerender } = render(
      <RhythmPreview
        isPreviewing
        pattern={basicRockPattern}
        status="counting-in"
      />,
    );
    tick(1);
    expect(activeCells(container)).toHaveLength(0);
    rerender(
      <RhythmPreview
        isPreviewing
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    tick(2);
    expect(activeCells(container)).toHaveLength(3);
    act(() => visualTimeline.reset());
    expect(activeCells(container)).toHaveLength(0);
    rerender(
      <RhythmPreview
        isPreviewing
        pattern={basicRockPattern}
        status="suspended"
      />,
    );
    tick(3);
    expect(activeCells(container)).toHaveLength(0);
  });

  it("displays the correct measure of multi-bar patterns and includes tom and crash hits", () => {
    const pattern: DrumPattern = {
      ...basicRockPattern,
      bars: 2,
      hits: [
        { id: "crash", instrument: "crash", step: 0, velocity: 0.9 },
        { id: "tom", instrument: "lowTom", step: 10, velocity: 0.7 },
      ],
    };
    const { container } = render(
      <RhythmPreview isPreviewing pattern={pattern} status="playing" />,
    );
    expect(screen.getAllByText("Toms")[0]).toBeVisible();
    tick(2, 2);
    const measures = container.querySelectorAll<HTMLElement>(
      "[data-rhythm-measure]",
    );
    expect(measures[0]).not.toBeVisible();
    expect(measures[1]).toBeVisible();
    expect(screen.getByRole("img")).toHaveAccessibleDescription(
      /Measure 2 of 2/,
    );
    expect(
      measures[1].querySelector('[data-row="Toms"] [data-step="2"]'),
    ).toHaveAttribute("data-hit", "true");
    expect(
      measures[0].querySelector('[data-row="Top"] [data-step="0"]'),
    ).toHaveAttribute("data-hit", "true");
    tick(0, 3);
    expect(measures[0]).toBeVisible();
    expect(measures[1]).not.toBeVisible();
  });

  it("unsubscribes from the visual timeline when leaving the library", () => {
    const unsubscribe = vi.fn();
    vi.spyOn(visualTimeline, "subscribe").mockReturnValue(unsubscribe);
    const { unmount } = render(
      <RhythmPreview
        isPreviewing
        pattern={basicRockPattern}
        status="playing"
      />,
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
