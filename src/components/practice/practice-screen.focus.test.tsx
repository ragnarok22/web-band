import {
  engine,
  selectQuickPattern,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { guidanceTimeline } from "@/audio/guidance-timeline";
import { useAudioStore } from "@/stores/audio-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { usePracticeStore } from "@/stores/practice-store";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("practice screen — focus", () => {
  setupPracticeScreenTests();

  it("configures count-in and opens the focused practice view", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await user.click(screen.getByRole("radio", { name: "2 bars" }));
    expect(usePracticeStore.getState().countInMeasures).toBe(2);
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByText("Focus session")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Current pattern" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the same playback and practice live regions mounted in focus mode", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    const playbackLiveRegion = screen.getByTestId("playback-live-region");
    const practiceLiveRegion = screen.getByTestId("practice-live-region");
    await selectQuickPattern(user, "one-drop");
    expect(practiceLiveRegion).toHaveTextContent(
      "Pattern changed to One Drop.",
    );
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByTestId("playback-live-region")).toBe(playbackLiveRegion);
    expect(screen.getByTestId("practice-live-region")).toBe(practiceLiveRegion);
    act(() => useAudioStore.setState({ status: "playing" }));
    expect(playbackLiveRegion).toHaveTextContent("Groove playing");
    expect(practiceLiveRegion).toHaveTextContent(
      "Pattern changed to One Drop.",
    );
  });

  it("keeps current notices visible in focus mode", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({
      errorMessage: "Audio output is unavailable.",
      status: "error",
    });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Audio output is unavailable.",
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "Sound begins after you press Play",
    );
  });

  it("offers Resume for paused and suspended focus sessions", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "paused" });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Focus" }));
    const resumeButton = screen.getByRole("button", { name: "Resume" });
    await user.click(resumeButton);
    expect(engine.play).toHaveBeenCalledOnce();
    act(() => useAudioStore.setState({ status: "suspended" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("shows the retained tempo-trainer BPM in focus mode", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({ mode: "tempoTrainer" });
    useAudioStore.setState({ status: "playing" });
    guidanceTimeline.begin();
    guidanceTimeline.publish({
      absoluteSixteenth: 16,
      elapsedSeconds: 8,
      measure: 2,
      mode: "tempoTrainer",
      position: {
        completedIntervals: 5,
        currentBpm: 105,
        isAtTarget: false,
        measuresUntilChange: 2,
        nextBpm: 110,
        progress: 0.625,
        secondsUntilChange: null,
        shouldStop: false,
      },
    });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(
      screen.getByText("Tempo", { selector: "p" }).nextElementSibling,
    ).toHaveTextContent("105");
  });

  it("announces when the tempo trainer reaches its target", () => {
    useGuidedPracticeStore.setState({ mode: "tempoTrainer" });
    render(<PracticeScreen />);
    act(() => {
      guidanceTimeline.begin();
      guidanceTimeline.publish({
        absoluteSixteenth: 80,
        elapsedSeconds: 40,
        measure: 21,
        mode: "tempoTrainer",
        position: {
          completedIntervals: 20,
          currentBpm: 110,
          isAtTarget: true,
          measuresUntilChange: null,
          nextBpm: null,
          progress: 1,
          secondsUntilChange: null,
          shouldStop: true,
        },
      });
    });
    expect(screen.getByTestId("practice-live-region")).toHaveTextContent(
      "Target tempo reached at 110 BPM.",
    );
  });

  it("retains current and next guided cues when focus opens mid-session", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({ mode: "chords" });
    useAudioStore.setState({ status: "playing" });
    guidanceTimeline.begin();
    guidanceTimeline.publish({
      absoluteSixteenth: 4,
      elapsedSeconds: 1,
      measure: 1,
      mode: "chords",
      position: {
        countdown: 3,
        currentChord: "D",
        currentStepId: "g-d-em-c-d",
        currentStepIndex: 1,
        cycle: 0,
        isComplete: false,
        nextChord: "Em",
        nextStepId: "g-d-em-c-em",
        sixteenthsIntoStep: 0,
        sixteenthsRemaining: 12,
      },
    });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByText("Focus session")).toBeInTheDocument();
    expect(
      screen.getByText("Current chord").nextElementSibling,
    ).toHaveTextContent("D");
    expect(screen.getByText("Next chord").nextElementSibling).toHaveTextContent(
      "Em",
    );
  });
});
