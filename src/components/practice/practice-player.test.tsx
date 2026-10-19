import {
  engine,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { visualTimeline } from "@/audio/visual-timeline";
import { PracticePlayer } from "@/components/practice/practice-player";
import { usePracticeController } from "@/hooks/use-practice-controller";
import { useAudioStore } from "@/stores/audio-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePracticeUiStore } from "@/stores/practice-ui-store";
import { renderWithMotion as render } from "@/test/render-with-motion";

function PlayerHarness() {
  const practice = usePracticeController();
  return (
    <PracticePlayer
      practice={practice}
      beatFlashIntensity="minimal"
      visualSubdivisionDetail="sixteenths"
    />
  );
}

describe("PracticePlayer", () => {
  setupPracticeScreenTests();
  afterEach(() => visualTimeline.reset());

  it("composes beats, tempo, transport, and session tools in one practice area", () => {
    render(<PlayerHarness />);
    const player = within(
      screen.getByRole("region", { name: "Practice player" }),
    );
    expect(
      player.getByRole("region", { name: "Beat visualization" }),
    ).toBeVisible();
    expect(player.getByRole("spinbutton", { name: "Current BPM" })).toHaveValue(
      90,
    );
    expect(player.getByRole("button", { name: "Play" })).toBeEnabled();
    expect(
      player.getByRole("combobox", { name: "Count-in length" }),
    ).toHaveValue("1");
    expect(player.getByText("00:00")).toBeVisible();
    expect(player.getByTestId("transport-status")).toHaveTextContent(/^Ready$/);
    expect(player.queryByRole("slider", { name: "Tempo" })).toBeNull();
    expect(
      player.queryByRole("button", { name: "Increase BPM by 5" }),
    ).toBeNull();
    expect(engine.play).not.toHaveBeenCalled();
  });

  it("keeps one-BPM adjustments primary regardless of the shortcut preference", async () => {
    const user = userEvent.setup();
    usePracticeStore.setState({ bpmAdjustmentStep: 5 });
    render(<PlayerHarness />);
    await user.click(screen.getByRole("button", { name: "Increase BPM by 1" }));
    expect(usePracticeStore.getState().bpm).toBe(91);
    await user.click(
      screen.getByRole("button", { name: "More tempo controls" }),
    );
    await user.click(screen.getByRole("button", { name: "Increase BPM by 5" }));
    expect(usePracticeStore.getState().bpm).toBe(96);
  });

  it("adjusts live tempo, exposes advanced controls, and preserves the audible playhead", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    render(<PlayerHarness />);
    const visualizer = screen.getByRole("region", {
      name: "Beat visualization",
    });
    act(() =>
      visualTimeline.emit({
        isAccent: true,
        measure: 3,
        patternStep: 2,
        phase: "pattern",
        sixteenth: 4,
      }),
    );
    const beat = visualizer.querySelector('[data-sixteenth="4"]');
    expect(beat).toHaveClass("beat-step--active");
    await user.click(screen.getByRole("button", { name: "Increase BPM by 1" }));
    expect(engine.setBpm).toHaveBeenLastCalledWith(91);
    await user.click(
      screen.getByRole("button", { name: "More tempo controls" }),
    );
    await user.click(screen.getByRole("button", { name: "Increase BPM by 5" }));
    expect(engine.setBpm).toHaveBeenLastCalledWith(96);
    fireEvent.change(screen.getByRole("slider", { name: "Tempo" }), {
      target: { value: "105" },
    });
    expect(engine.setBpm).toHaveBeenLastCalledWith(105);
    await user.click(
      screen.getByRole("button", { name: "Reset tempo to 90 BPM" }),
    );
    expect(engine.setBpm).toHaveBeenLastCalledWith(90);
    expect(screen.getByRole("region", { name: "Beat visualization" })).toBe(
      visualizer,
    );
    expect(beat).toHaveClass("beat-step--active");
    expect(visualizer).toHaveTextContent("Measure 3");
    expect(engine.stop).not.toHaveBeenCalled();
  });

  it("keeps tap tempo and every count-in option available in the secondary toolbar", async () => {
    const user = userEvent.setup();
    render(<PlayerHarness />);
    const countIn = screen.getByRole("combobox", { name: "Count-in length" });
    for (const value of ["0", "1", "2", "4"]) {
      await user.selectOptions(countIn, value);
      expect(usePracticeStore.getState().countInMeasures).toBe(Number(value));
    }
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000);
    await user.click(screen.getByRole("button", { name: /Tap tempo/ }));
    now.mockReturnValue(1500);
    await user.click(screen.getByRole("button", { name: /Tap tempo/ }));
    now.mockRestore();
    expect(usePracticeStore.getState().bpm).toBe(120);
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({ bpm: 120, countInMeasures: 4 }),
    );
    act(() => useAudioStore.setState({ status: "counting-in" }));
    expect(countIn).toBeDisabled();
    expect(screen.getByTestId("transport-status")).toHaveTextContent(
      "Counting in",
    );
    act(() =>
      visualTimeline.emit({
        beat: 2,
        isAccent: false,
        measure: 2,
        phase: "count-in",
      }),
    );
    expect(document.querySelector(".count-in-display")).toHaveTextContent(
      "Bar 2 of 4",
    );
  });

  it("preserves pause, resume, graceful finish, immediate stop, and session actions", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    render(<PlayerHarness />);
    await user.click(screen.getByRole("button", { name: "Pause playback" }));
    expect(engine.pause).toHaveBeenCalledOnce();
    act(() => useAudioStore.setState({ status: "paused" }));
    expect(
      screen.getByRole("button", { name: "Pause playback" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(engine.play).toHaveBeenCalledOnce();
    act(() => useAudioStore.setState({ status: "playing" }));
    await user.click(screen.getByRole("button", { name: "Finish with fill" }));
    expect(engine.queueStopWithFill).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Finishing after fill" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Open Shortcuts" }));
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(usePracticeUiStore.getState().isFocusMode).toBe(true);
    expect(engine.stop).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(engine.stop).toHaveBeenCalledOnce();
  });

  it.each([
    ["strumming", "Strumming trainer guidance"],
    ["chords", "Chord trainer guidance"],
    ["tempoTrainer", "Tempo trainer guidance"],
  ] as const)(
    "integrates %s cues without conflicting tempo controls",
    (mode, label) => {
      useGuidedPracticeStore.setState({ mode });
      render(<PlayerHarness />);
      const player = within(
        screen.getByRole("region", { name: "Practice player" }),
      );
      expect(player.getByRole("region", { name: label })).toBeVisible();
      expect(
        player.getByRole("region", { name: "Beat visualization" }),
      ).toBeVisible();
      if (mode === "tempoTrainer") {
        expect(
          player.queryByRole("spinbutton", { name: "Current BPM" }),
        ).toBeNull();
        expect(player.getByTestId("trainer-current-bpm")).toHaveTextContent(
          "80",
        );
        act(() => useAudioStore.setState({ status: "playing" }));
        expect(
          player.getByRole("button", { name: /Tap tempo/ }),
        ).toBeDisabled();
      }
    },
  );
});
