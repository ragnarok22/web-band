import {
  engine,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { gDEmCProgression } from "@/data/chord-progressions";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { useAudioStore } from "@/stores/audio-store";
import {
  getGuidedPracticeConfiguration,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import { useStorageStore } from "@/stores/storage-store";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("practice screen", () => {
  setupPracticeScreenTests();

  it("offers graceful finish and immediate stop while playing", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Finish with fill" }));
    expect(engine.queueStopWithFill).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Finishing after fill" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(engine.stop).toHaveBeenCalledOnce();
  });

  it("shows Basic Rock and starts only after Play is pressed", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    expect(
      screen.getByRole("heading", { name: "Basic Rock" }),
    ).toBeInTheDocument();
    expect(engine.play).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({
        bpm: 90,
        countInMeasures: 1,
        fillFrequency: null,
        humanization: 0,
        masterVolume: 0.8,
        mixer: defaultPracticeSettings.mixer,
        swing: 0,
      }),
    );
  });

  it("does not play fallback audio before all practice stores hydrate", async () => {
    const user = userEvent.setup();
    usePracticeStore.setState({ hasHydrated: false });
    useGuidedPracticeStore.setState({ isHydrated: false });
    usePatternStore.setState({ isHydrated: false });
    render(<PracticeScreen />);
    expect(
      screen.getByText("Loading your saved practice setup…"),
    ).toBeVisible();
    const play = screen.getByRole("button", { name: "Play" });
    expect(play).toBeDisabled();
    await user.click(play);
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(engine.play).not.toHaveBeenCalled();
    act(() => {
      usePracticeStore.setState({ hasHydrated: true });
      useGuidedPracticeStore.setState({ isHydrated: true });
      usePatternStore.setState({ isHydrated: true });
    });
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
  });

  it("passes the current guided-practice snapshot to the audio engine", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({
      chordTrainer: {
        progression: structuredClone(gDEmCProgression),
        repeat: false,
        showCountdown: false,
      },
      mode: "chords",
    });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({
        guidedPractice: getGuidedPracticeConfiguration(
          useGuidedPracticeStore.getState(),
        ),
      }),
    );
  });

  it("switches guided modes and disables trainer controls while active", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await user.click(screen.getByRole("radio", { name: /Tempo/ }));
    expect(useGuidedPracticeStore.getState().mode).toBe("tempoTrainer");
    expect(screen.getByRole("spinbutton", { name: "Start BPM" })).toBeEnabled();
    expect(
      screen.queryByRole("spinbutton", { name: "Current BPM" }),
    ).not.toBeInTheDocument();
    act(() => useAudioStore.setState({ status: "playing" }));
    for (const radio of screen.getAllByRole("radio", {
      name: /Drums|Tempo|Chords|Strumming/,
    })) {
      expect(radio).toHaveAttribute("aria-disabled", "true");
    }
    expect(
      screen.getByRole("spinbutton", { name: "Start BPM" }),
    ).toBeDisabled();
  });

  it("dismisses the browser audio onboarding hint", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<PracticeScreen />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Sound begins after you press Play",
    );
    await user.click(screen.getByRole("button", { name: "Dismiss audio tip" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(useStorageStore.getState().preferenceWriteFailures).toContain(
      "onboarding",
    );
  });
});
