import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { FocusMode } from "@/components/practice/focus-mode";
import { basicRockPattern } from "@/data/patterns/rock";
import { renderWithMotion as render } from "@/test/render-with-motion";

function createProps(): ComponentProps<typeof FocusMode> {
  return {
    beatFlashIntensity: "standard",
    bpm: 108,
    configuration: { mode: "drums" },
    countInMeasures: 0,
    elapsedSeconds: 65,
    errorMessage: null,
    historyNotice: null,
    isFinishing: false,
    isReady: true,
    onDismissNotice: vi.fn(),
    onExit: vi.fn(),
    onFinish: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    pattern: basicRockPattern,
    showOnboarding: false,
    status: "ready",
    visualSubdivisionDetail: "beats",
    wakeLockStatus: "idle",
  };
}

describe("focus mode", () => {
  beforeEach(() => guidanceTimeline.reset());
  afterEach(() => guidanceTimeline.reset());

  it.each([
    ["not-initialized", false, false, "Loading setup", true, false],
    ["ready", true, false, "Play", false, false],
    ["initializing", true, false, "Play", true, true],
    ["counting-in", true, false, "Finish with fill", false, true],
    ["playing", true, false, "Finish with fill", false, true],
    ["playing", true, true, "Finishing after fill", true, true],
    ["paused", false, false, "Resume", false, true],
    ["suspended", false, false, "Resume", false, true],
    ["stopped", true, false, "Play", false, false],
    ["error", true, false, "Play", false, false],
  ] as const)(
    "preserves transport actions for %s (ready: %s, finishing: %s)",
    async (status, isReady, isFinishing, label, disabled, canStop) => {
      const user = userEvent.setup();
      const props = { ...createProps(), isFinishing, isReady, status };
      render(<FocusMode {...props} />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
      const primary = screen.getByRole("button", { name: label });
      const stop = screen.getByRole("button", { name: "Stop now" });
      expect(primary).toHaveProperty("disabled", disabled);
      expect(stop).toHaveProperty("disabled", !canStop);

      await user.click(primary);
      expect(props.onFinish).toHaveBeenCalledTimes(
        !disabled && label === "Finish with fill" ? 1 : 0,
      );
      expect(props.onPlay).toHaveBeenCalledTimes(
        !disabled && label !== "Finish with fill" ? 1 : 0,
      );
      await user.click(stop);
      expect(props.onStop).toHaveBeenCalledTimes(canStop ? 1 : 0);
      await user.click(screen.getByRole("button", { name: "Exit focus" }));
      expect(props.onExit).toHaveBeenCalledOnce();
    },
  );

  it("keeps tempo-trainer fallback and live BPM separate from ordinary BPM", () => {
    const props = createProps();
    const { rerender } = render(
      <FocusMode
        {...props}
        configuration={{
          mode: "tempoTrainer",
          tempoTrainer: {
            endBpm: 120,
            increment: 5,
            interval: { measures: 4, type: "measures" },
            resetToStartingBpmOnStop: true,
            startBpm: 80,
            stopAtTarget: true,
          },
        }}
      />,
    );
    expect(screen.getByText("Tempo").nextElementSibling).toHaveTextContent(
      "80",
    );

    act(() => {
      guidanceTimeline.begin();
      guidanceTimeline.publish({
        absoluteSixteenth: 16,
        elapsedSeconds: 8,
        measure: 2,
        mode: "tempoTrainer",
        position: {
          completedIntervals: 2,
          currentBpm: 90,
          isAtTarget: false,
          measuresUntilChange: 2,
          nextBpm: 95,
          progress: 0.25,
          secondsUntilChange: null,
          shouldStop: false,
        },
      });
    });
    expect(screen.getByText("Tempo").nextElementSibling).toHaveTextContent(
      "90",
    );

    rerender(<FocusMode {...props} />);
    expect(screen.getByText("Tempo").nextElementSibling).toHaveTextContent(
      "108",
    );
  });
});
