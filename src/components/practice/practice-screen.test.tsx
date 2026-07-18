import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PracticeScreen } from "@/components/practice/practice-screen";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePracticeUiStore } from "@/stores/practice-ui-store";

const engine = vi.hoisted(() => ({
  changePattern: vi.fn(() => false),
  pause: vi.fn(),
  play: vi.fn(() => Promise.resolve()),
  setBpm: vi.fn(),
  setFillFrequency: vi.fn(),
  setHumanization: vi.fn(),
  setMasterVolume: vi.fn(),
  setMixer: vi.fn(),
  setSwing: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: vi.fn(),
  getAudioEngine: () => engine,
}));

describe("practice screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAudioStore.setState({ errorMessage: null, status: "not-initialized" });
    usePracticeStore.setState({
      ...defaultPracticeSettings,
      hasHydrated: true,
      mixer: structuredClone(defaultPracticeSettings.mixer),
    });
    usePracticeUiStore.setState({ isFocusMode: false });
    usePatternStore.setState({
      customPatterns: [],
      favoritePatternIds: [],
      isHydrated: true,
      recentPatternIds: [],
    });
  });

  it("changes a stopped pattern immediately", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Current pattern" }),
      "one-drop",
    );
    expect(
      screen.getByRole("heading", { name: "One Drop" }),
    ).toBeInTheDocument();
    expect(usePracticeStore.getState().selectedPatternId).toBe("one-drop");
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

  it("dismisses the browser audio onboarding hint", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);

    expect(screen.getByRole("note")).toHaveTextContent(
      "Sound begins after you press Play",
    );
    await user.click(screen.getByRole("button", { name: "Dismiss audio tip" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("uses Space to start while idle and stop while active", () => {
    render(<PracticeScreen />);

    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(engine.play).toHaveBeenCalledOnce();

    for (const status of [
      "initializing",
      "counting-in",
      "playing",
      "paused",
      "suspended",
    ] as const) {
      act(() => useAudioStore.setState({ status }));
      fireEvent.keyDown(window, { code: "Space", key: " " });
    }
    expect(engine.stop).toHaveBeenCalledTimes(5);
    expect(engine.play).toHaveBeenCalledOnce();
  });

  it("does not run global shortcuts from editable controls", () => {
    render(<PracticeScreen />);
    const bpmInput = screen.getByRole("spinbutton", { name: "Current BPM" });

    fireEvent.keyDown(bpmInput, { code: "Space", key: " " });
    fireEvent.keyDown(screen.getByRole("button", { name: /Tap tempo/ }), {
      code: "Space",
      key: " ",
    });
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Current pattern" }),
      { code: "Space", key: " " },
    );

    expect(engine.play).not.toHaveBeenCalled();
  });

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

  it("updates groove controls and mixer state", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);

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
