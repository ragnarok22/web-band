import {
  engine,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { disposeAudioEngine } from "@/audio/audio-engine";
import { useAudioStore } from "@/stores/audio-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { usePracticeStore } from "@/stores/practice-store";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("practice screen — controls", () => {
  setupPracticeScreenTests();

  it("starts with Controls collapsed and preserves playback and settings through toggles", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    usePracticeStore.setState({ swing: 0.25, masterVolume: 0.42 });
    render(<PracticeScreen />);
    const controls = screen.getByRole("button", { name: "Controls" });
    expect(controls).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("complementary", { name: "Practice controls" }),
    ).toBeNull();
    const visualizer = screen.getByRole("region", {
      name: "Beat visualization",
    });
    await user.click(controls);
    expect(controls).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("slider", { name: "Master" })).toHaveValue("0.42");
    await user.click(screen.getByRole("button", { name: "Hide controls" }));
    expect(screen.getByRole("region", { name: "Beat visualization" })).toBe(
      visualizer,
    );
    expect(usePracticeStore.getState()).toMatchObject({
      swing: 0.25,
      masterVolume: 0.42,
    });
    expect(useAudioStore.getState().status).toBe("playing");
    expect(engine.stop).not.toHaveBeenCalled();
    expect(engine.play).not.toHaveBeenCalled();
    expect(disposeAudioEngine).not.toHaveBeenCalled();
  });

  it("dismisses the mobile Controls Sheet without stopping audio or resetting mixer settings", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    render(<PracticeScreen />);
    const trigger = screen.getByRole("button", { name: "Controls" });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Practice controls" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Mute Kick" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(engine.stop).not.toHaveBeenCalled();
    expect(disposeAudioEngine).not.toHaveBeenCalled();
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Mute Kick" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(useAudioStore.getState().status).toBe("playing");
    await user.click(screen.getByRole("button", { name: "Close" }));
  });

  it("keeps kit character and Keep Awake in the existing settings store", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Controls" }));
    await user.click(screen.getByRole("button", { name: "Drum Kit" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sound character" }),
      "punchy",
    );
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(
      screen.getByRole("button", { name: "Keep awake while playing" }),
    );
    expect(usePracticeStore.getState()).toMatchObject({
      soundCharacter: "punchy",
      wakeLockEnabled: false,
    });
    await user.click(screen.getByRole("button", { name: "Hide controls" }));
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({ soundCharacter: "punchy" }),
    );
  });

  it("disables persisted toggles until practice stores hydrate", async () => {
    const user = userEvent.setup();
    usePracticeStore.setState({ hasHydrated: false });
    useGuidedPracticeStore.setState({ isHydrated: false });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Controls" }));
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    expect(
      screen.getByRole("button", { name: "Keep awake while playing" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mute Kick" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Tempo/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "More tempo controls" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Count-in length" }),
    ).toBeDisabled();
  });

  it("shows Wake Lock request failures in regular and focus modes", async () => {
    const user = userEvent.setup();
    const request = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });
    usePracticeStore.setState({ wakeLockEnabled: true });
    useAudioStore.setState({ status: "playing" });
    render(<PracticeScreen />);
    expect(
      await screen.findByText(/The screen could not be kept awake/),
    ).toBeVisible();
    expect(request).toHaveBeenCalledWith("screen");
    await user.click(screen.getByRole("button", { name: "Controls" }));
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    expect(
      screen.getByRole("button", { name: "Keep awake while playing" }),
    ).toHaveAttribute("aria-describedby", "wake-lock-status");
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(
      screen.getByText(/The screen could not be kept awake/),
    ).toBeVisible();
  });

  it("uses one expanding workspace rather than a permanent three-column layout", () => {
    render(<PracticeScreen />);
    const workspace = screen
      .getByRole("main")
      .querySelector(".practice-layout");
    expect(workspace).toHaveAttribute("data-controls-open", "false");
    expect(
      screen.getByRole("radiogroup", { name: "Practice mode" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Metronome — Coming soon" }),
    ).toBeDisabled();
  });

  it("applies master mute once per action under Strict Mode and restores the selected volume", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <PracticeScreen />
      </StrictMode>,
    );
    await user.click(screen.getByRole("button", { name: "Controls" }));
    const mute = screen.getByRole("button", { name: "Master mute" });
    expect(engine.setMasterVolume).not.toHaveBeenCalled();
    await user.click(mute);
    expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(engine.setMasterVolume.mock.calls).toEqual([[0]]);
    fireEvent.change(screen.getByRole("slider", { name: "Master" }), {
      target: { value: "0.35" },
    });
    expect(usePracticeStore.getState().masterVolume).toBe(0.35);
    expect(engine.setMasterVolume.mock.calls).toEqual([[0], [0]]);
    await user.click(mute);
    expect(mute).toHaveAttribute("aria-pressed", "false");
    expect(engine.setMasterVolume.mock.calls).toEqual([[0], [0], [0.35]]);
  });

  it("preserves consecutive master mute shortcuts before a render", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    const volume = usePracticeStore.getState().masterVolume;
    act(() => {
      fireEvent.keyDown(window, { key: "m" });
      fireEvent.keyDown(window, { key: "m" });
    });
    await user.click(screen.getByRole("button", { name: "Controls" }));
    expect(screen.getByRole("button", { name: "Master mute" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(engine.setMasterVolume.mock.calls).toEqual([[0], [volume]]);
  });

  it("updates groove controls and mixer state", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Controls" }));
    await user.click(screen.getByRole("button", { name: "Groove Feel" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Phrase fills" }),
      "8",
    );
    await user.click(screen.getByRole("button", { name: "Mute Kick" }));
    expect(usePracticeStore.getState().fillFrequency).toBe(8);
    expect(engine.setFillFrequency).toHaveBeenCalledWith(8);
    expect(usePracticeStore.getState().mixer.kick.muted).toBe(true);
    expect(engine.setMixer).toHaveBeenCalled();
  });
});
