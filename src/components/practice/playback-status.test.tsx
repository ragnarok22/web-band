import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { visualTimeline } from "@/audio/visual-timeline";
import { PlaybackStatus } from "@/components/practice/playback-status";
import type { AudioEngineStatus } from "@/types/audio";

const defaults = {
  countInMeasures: 2 as const,
  errorMessage: null,
  isReady: true,
  timeSignature: { numerator: 4, denominator: 4 },
};

afterEach(() => visualTimeline.reset());

describe("playback status", () => {
  it.each([
    ["not-initialized", "Ready", "text-muted-foreground"],
    ["ready", "Ready", "text-muted-foreground"],
    ["playing", "Playing", "text-success"],
    ["paused", "Paused", "text-primary"],
    ["stopped", "Stopped", "text-muted-foreground"],
    ["suspended", "Audio suspended — press Play to resume", "text-primary"],
    ["error", "Audio unavailable", "text-danger"],
  ] satisfies Array<[AudioEngineStatus, string, string]>)(
    "presents %s clearly without using color alone",
    (status, label, color) => {
      render(<PlaybackStatus {...defaults} status={status} />);
      expect(screen.getByTestId("transport-status")).toHaveTextContent(label);
      expect(screen.getByTestId("playback-status-indicator")).toHaveClass(
        color,
      );
    },
  );

  it("counts down from audible count-in frames and restores the retained position", () => {
    const view = render(<PlaybackStatus {...defaults} status="counting-in" />);
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("8");
    act(() =>
      visualTimeline.emit({
        phase: "count-in",
        measure: 1,
        beat: 1,
        isAccent: false,
      }),
    );
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("7");
    act(() =>
      visualTimeline.emit({
        phase: "count-in",
        measure: 2,
        beat: 2,
        isAccent: false,
      }),
    );
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("2");
    view.rerender(<PlaybackStatus {...defaults} status="paused" />);
    expect(screen.queryByTestId("count-in-remaining")).toBeNull();
    view.rerender(<PlaybackStatus {...defaults} status="counting-in" />);
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("2");
    act(() => visualTimeline.reset());
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("8");
    view.rerender(<PlaybackStatus {...defaults} status="playing" />);
    expect(screen.queryByTestId("count-in-remaining")).toBeNull();
  });

  it("uses the active meter for the countdown", () => {
    render(
      <PlaybackStatus
        {...defaults}
        timeSignature={{ numerator: 6, denominator: 8 }}
        status="counting-in"
      />,
    );
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("12");
    act(() =>
      visualTimeline.emit({
        phase: "count-in",
        measure: 2,
        beat: 4,
        isAccent: false,
      }),
    );
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("2");
  });

  it("counts primary compound pulses for the independent metronome", () => {
    render(
      <PlaybackStatus
        {...defaults}
        pulsesPerMeasure={2}
        timeSignature={{ numerator: 6, denominator: 8 }}
        status="counting-in"
      />,
    );
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("4");
    act(() =>
      visualTimeline.emit({
        phase: "count-in",
        measure: 2,
        beat: 1,
        isAccent: false,
      }),
    );
    expect(screen.getByTestId("count-in-remaining")).toHaveTextContent("1");
  });

  it("keeps initialization and loading feedback visible", () => {
    const view = render(<PlaybackStatus {...defaults} status="initializing" />);
    expect(screen.getByTestId("transport-status")).toHaveTextContent(
      "Starting audio…",
    );
    view.rerender(
      <PlaybackStatus {...defaults} isReady={false} status="not-initialized" />,
    );
    expect(screen.getByTestId("transport-status")).toHaveTextContent(
      "Loading your saved practice setup…",
    );
  });

  it("shows the actual audio error, even before setup is ready", () => {
    render(
      <PlaybackStatus
        {...defaults}
        isReady={false}
        status="error"
        errorMessage="Audio permission denied. Try Play again."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Audio permission denied",
    );
    expect(screen.getByTestId("transport-status")).toHaveTextContent(
      "Audio unavailable",
    );
  });
});
