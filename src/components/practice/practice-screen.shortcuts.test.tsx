import {
  engine,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { openPresetMenu } from "@/test/open-preset-menu";
import { builtInPatterns } from "@/data/patterns";
import { useAudioStore } from "@/stores/audio-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { usePracticeStore } from "@/stores/practice-store";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("practice screen — shortcuts", () => {
  setupPracticeScreenTests();

  it("uses Space to play, pause, and resume", () => {
    render(<PracticeScreen />);
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(engine.play).toHaveBeenCalledOnce();
    for (const status of ["counting-in", "playing"] as const) {
      act(() => useAudioStore.setState({ status }));
      fireEvent.keyDown(window, { code: "Space", key: " " });
    }
    expect(engine.pause).toHaveBeenCalledTimes(2);
    for (const status of ["paused", "suspended"] as const) {
      act(() => useAudioStore.setState({ status }));
      fireEvent.keyDown(window, { code: "Space", key: " " });
    }
    expect(engine.play).toHaveBeenCalledTimes(3);
    expect(engine.stop).not.toHaveBeenCalled();
  });

  it("uses Left and Right arrows to move through patterns", () => {
    render(<PracticeScreen />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(usePracticeStore.getState().selectedPatternId).toBe(
      builtInPatterns[1]?.id,
    );
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(usePracticeStore.getState().selectedPatternId).toBe(
      builtInPatterns[0]?.id,
    );
  });

  it("suppresses global shortcuts while preset and mode dialogs are open", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(engine.play).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Close practice presets" }),
    );
    await user.click(screen.getByRole("radio", { name: /Chords/ }));
    await user.click(screen.getByRole("button", { name: "New" }));
    expect(
      screen.getByRole("dialog", { name: "Create progression" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(engine.play).not.toHaveBeenCalled();
  });

  it("routes idle tempo shortcuts to the trainer draft and locks them while active", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await user.click(screen.getByRole("radio", { name: /Tempo/ }));
    const now = vi.spyOn(performance, "now");
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(useGuidedPracticeStore.getState().tempoTrainer.startBpm).toBe(81);
    expect(usePracticeStore.getState().bpm).toBe(90);
    now.mockReturnValue(1_000);
    fireEvent.keyDown(window, { key: "t" });
    now.mockReturnValue(1_500);
    fireEvent.keyDown(window, { key: "t" });
    expect(useGuidedPracticeStore.getState().tempoTrainer.startBpm).toBe(120);
    act(() => {
      useGuidedPracticeStore.getState().setTempoTrainerConfiguration({
        ...useGuidedPracticeStore.getState().tempoTrainer,
        startBpm: 100,
      });
      useAudioStore.setState({ status: "playing" });
    });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    now.mockReturnValue(2_000);
    fireEvent.keyDown(window, { key: "t" });
    now.mockReturnValue(2_500);
    fireEvent.keyDown(window, { key: "t" });
    expect(useGuidedPracticeStore.getState().tempoTrainer.startBpm).toBe(100);
    expect(engine.setBpm).not.toHaveBeenCalled();
    now.mockRestore();
  });

  it("announces committed, tapped, and debounced keyboard tempo changes", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    const liveRegion = screen.getByTestId("practice-live-region");
    await user.click(
      screen.getByRole("button", { name: "More tempo controls" }),
    );
    const slider = screen.getByRole("slider", { name: "Tempo" });
    fireEvent.change(slider, { target: { value: "96" } });
    // Base UI commits a native input change immediately.
    expect(liveRegion).toHaveTextContent("Tempo set to 96 BPM.");
    await user.click(screen.getByRole("button", { name: "Increase BPM by 1" }));
    expect(liveRegion).toHaveTextContent("Tempo set to 97 BPM.");
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1_000);
    await user.click(screen.getByRole("button", { name: /Tap tempo/ }));
    now.mockReturnValue(1_500);
    await user.click(screen.getByRole("button", { name: /Tap tempo/ }));
    expect(liveRegion).toHaveTextContent("Tempo set to 120 BPM.");
    now.mockRestore();
    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(liveRegion).toHaveTextContent("Tempo set to 120 BPM.");
    await waitFor(() =>
      expect(liveRegion).toHaveTextContent("Tempo set to 123 BPM."),
    );
  });

  it("does not let a pending keyboard message overwrite a newer tempo action", async () => {
    render(<PracticeScreen />);
    const liveRegion = screen.getByTestId("practice-live-region");
    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.click(screen.getByRole("button", { name: "Increase BPM by 1" }));
    expect(liveRegion).toHaveTextContent("Tempo set to 92 BPM.");
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 300)));
    expect(liveRegion).toHaveTextContent("Tempo set to 92 BPM.");
  });

  it("does not run global shortcuts from editable controls", () => {
    render(<PracticeScreen />);
    const bpmInput = screen.getByRole("spinbutton", { name: "Current BPM" });
    fireEvent.keyDown(bpmInput, { code: "Space", key: " " });
    fireEvent.keyDown(screen.getByRole("button", { name: /Tap tempo/ }), {
      code: "Space",
      key: " ",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Change Pattern" }), {
      code: "Space",
      key: " ",
    });
    expect(engine.play).not.toHaveBeenCalled();
  });
});
