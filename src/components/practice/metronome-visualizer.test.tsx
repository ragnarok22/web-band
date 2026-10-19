import { act, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  metronomeTimeline,
  type MetronomeFrame,
} from "@/audio/metronome-timeline";
import { MetronomeVisualizer } from "@/components/practice/metronome-visualizer";
import { createDefaultMetronomeConfiguration } from "@/lib/metronome";

const frame: MetronomeFrame = {
  audioTime: 10,
  transportTick: 0,
  beat: 0,
  measure: 1,
  phase: "metronome",
  isAccent: true,
  subdivision: 2,
  subdivisionIndex: 0,
  stage: 0,
  stageMeasure: 1,
};
afterEach(() => metronomeTimeline.reset());

describe("audio-synchronized metronome visualization", () => {
  it("moves one light and updates measure text without rendering on every attack", () => {
    const onRender = vi.fn();
    const view = render(
      <Profiler id="metronome" onRender={onRender}>
        <MetronomeVisualizer
          configuration={{
            ...createDefaultMetronomeConfiguration(),
            subdivision: 2,
          }}
          status="playing"
          countInMeasures={0}
        />
      </Profiler>,
    );
    act(() => metronomeTimeline.emit(frame));
    const renderCount = onRender.mock.calls.length;
    act(() =>
      metronomeTimeline.emit({
        ...frame,
        audioTime: 10.25,
        subdivisionIndex: 1,
        measure: 3,
      }),
    );
    expect(onRender).toHaveBeenCalledTimes(renderCount);
    expect(
      view.container.querySelectorAll('[data-active="true"]'),
    ).toHaveLength(1);
    expect(
      screen.getByRole("region", { name: "Beat visualization" }),
    ).toHaveTextContent("Measure 3");
    act(() => metronomeTimeline.reset());
    expect(
      view.container.querySelectorAll('[data-active="true"]'),
    ).toHaveLength(0);
    expect(
      screen.getByRole("region", { name: "Beat visualization" }),
    ).toHaveTextContent("Measure 1");
  });

  it("changes progressive stage and subdivision together and retains a paused frame on remount", () => {
    const props = {
      configuration: {
        ...createDefaultMetronomeConfiguration(),
        trainingMode: "progressive" as const,
      },
      status: "paused" as const,
      countInMeasures: 0 as const,
    };
    const view = render(<MetronomeVisualizer {...props} />);
    act(() =>
      metronomeTimeline.emit({
        ...frame,
        subdivision: 3,
        stage: 2,
        stageMeasure: 3,
        beat: 2,
        subdivisionIndex: 1,
      }),
    );
    expect(screen.getByText("Stage 3 of 4")).toBeVisible();
    expect(screen.getByText("Eighth-note triplets")).toBeVisible();
    expect(screen.getByLabelText("Progressive training")).toHaveTextContent(
      "Measure 3 of 4",
    );
    expect(
      view.container.querySelectorAll('[data-active="true"]'),
    ).toHaveLength(1);
    view.unmount();
    const remounted = render(<MetronomeVisualizer {...props} />);
    expect(
      remounted.container.querySelectorAll('[data-active="true"]'),
    ).toHaveLength(1);
    expect(screen.getByText("Stage 3 of 4")).toBeVisible();
  });
});
