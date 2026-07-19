import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { gDEmCProgression } from "@/data/chord-progressions";
import { builtInPatterns } from "@/data/patterns";
import { quarterDownstrokesPattern } from "@/data/strumming-patterns";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { useAudioStore } from "@/stores/audio-store";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import {
  createDefaultGuidedPracticeValues,
  getGuidedPracticeConfiguration,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePracticeUiStore } from "@/stores/practice-ui-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";
import type {
  CustomChordProgression,
  CustomStrummingPattern,
  PracticePreset,
} from "@/types/persistence";

const engine = vi.hoisted(() => ({
  changePattern: vi.fn((...arguments_: [unknown?, (() => void)?, boolean?]) => {
    void arguments_;
    return false;
  }),
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

const deletedCustomProgression: CustomChordProgression = {
  createdAt: "2026-07-18T10:00:00.000Z",
  id: "deleted-custom-progression",
  isBuiltIn: false,
  name: "Deleted changes",
  steps: [
    {
      chord: "Am",
      duration: 1,
      durationUnit: "measures",
      id: "deleted-am",
    },
  ],
  updatedAt: "2026-07-18T10:00:00.000Z",
};

const deletedCustomStrummingPattern: CustomStrummingPattern = {
  ...structuredClone(quarterDownstrokesPattern),
  createdAt: "2026-07-18T10:00:00.000Z",
  id: "deleted-custom-strumming-pattern",
  isBuiltIn: false,
  name: "Deleted strumming pattern",
  updatedAt: "2026-07-18T10:00:00.000Z",
};

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: vi.fn(),
  getAudioEngine: () => engine,
}));

function createPreset(
  name: string,
  configuration: PracticePreset["configuration"],
): PracticePreset {
  return {
    configuration,
    createdAt: "2026-07-18T10:00:00.000Z",
    id: name.toLowerCase().replaceAll(" ", "-"),
    isFavorite: false,
    lastUsedAt: "2026-07-18T10:00:00.000Z",
    name,
    updatedAt: "2026-07-18T10:00:00.000Z",
  };
}

describe("practice screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guidanceTimeline.reset();
    useAudioStore.setState({ errorMessage: null, status: "not-initialized" });
    useGuidedPracticeStore.setState({
      ...createDefaultGuidedPracticeValues(),
      isHydrated: true,
    });
    useChordProgressionStore.setState({
      customProgressions: [],
      favoriteProgressionIds: [],
      isHydrated: true,
    });
    useStrummingPatternStore.setState({
      customPatterns: [],
      isHydrated: true,
    });
    usePracticeStore.setState({
      ...defaultPracticeSettings,
      hasHydrated: true,
      mixer: structuredClone(defaultPracticeSettings.mixer),
    });
    usePracticeUiStore.setState({ isFocusMode: false, openModalCount: 0 });
    usePatternStore.setState({
      customPatterns: [],
      favoritePatternIds: [],
      isHydrated: true,
      recentPatternIds: [],
    });
    usePracticePresetStore.setState({
      isHydrated: true,
      markUsed: vi.fn().mockResolvedValue(undefined),
      presets: [],
      recentPresetIds: [],
    });
  });

  it("provides disclosure controls for advanced mobile settings", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);

    const guidedPractice = screen.getByRole("button", {
      name: "Show guided practice settings",
    });
    const groove = screen.getByRole("button", {
      name: "Show groove settings",
    });
    expect(guidedPractice).toHaveAttribute("aria-expanded", "false");
    expect(groove).toHaveAttribute("aria-expanded", "false");

    await user.click(guidedPractice);
    await user.click(groove);

    expect(
      screen.getByRole("button", { name: "Hide guided practice settings" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "Hide groove settings" }),
    ).toHaveAttribute("aria-expanded", "true");
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

  it("adopts a selected pattern's default swing", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Current pattern" }),
      "shuffle-blues",
    );

    expect(usePracticeStore.getState().swing).toBe(0.34);
    expect(screen.getByText("Swing 8ths")).toBeInTheDocument();
  });

  it("queues active pattern changes by default", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    engine.changePattern.mockReturnValueOnce(true);
    render(<PracticeScreen />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Current pattern" }),
      "driving-eighths",
    );

    expect(engine.changePattern).toHaveBeenCalledWith(
      expect.objectContaining({ id: "driving-eighths" }),
      expect.any(Function),
      false,
    );
    expect(screen.getByText("Queued for the next measure")).toBeInTheDocument();
  });

  it("switches an active same-meter pattern immediately when requested", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    usePracticeStore.setState({ swing: 0.34 });
    render(<PracticeScreen />);
    const immediateSwitch = screen.getByRole("checkbox", {
      name: "Switch same-meter patterns immediately",
    });
    engine.changePattern.mockImplementationOnce(
      (
        _pattern: unknown,
        onPatternChanged?: () => void,
        immediate?: boolean,
      ) => {
        expect(immediate).toBe(true);
        onPatternChanged?.();
        return true;
      },
    );

    await user.click(immediateSwitch);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Current pattern" }),
      "driving-eighths",
    );

    expect(usePracticeStore.getState()).toMatchObject({
      selectedPatternId: "driving-eighths",
      swing: 0,
    });
    expect(
      screen.queryByText("Queued for the next measure"),
    ).not.toBeInTheDocument();
  });

  it("keeps cross-meter changes queued when immediate switching is enabled", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    engine.changePattern.mockReturnValueOnce(true);
    render(<PracticeScreen />);

    await user.click(
      screen.getByRole("checkbox", {
        name: "Switch same-meter patterns immediately",
      }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Current pattern" }),
      "simple-six-eight",
    );

    expect(engine.changePattern).toHaveBeenCalledWith(
      expect.objectContaining({ id: "simple-six-eight" }),
      expect.any(Function),
      false,
    );
    expect(screen.getByText("Queued for the next measure")).toBeInTheDocument();
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
      expect(radio).toBeDisabled();
    }
    expect(
      screen.getByRole("spinbutton", { name: "Start BPM" }),
    ).toBeDisabled();
  });

  it("loads a complete valid preset without partial store updates", async () => {
    const user = userEvent.setup();
    const preset = createPreset("Chord Builder", {
      bpm: 112,
      countInMeasures: 2,
      fillFrequency: 8,
      guidedPractice: {
        chordTrainer: {
          progression: structuredClone(gDEmCProgression),
          repeat: false,
          showCountdown: true,
        },
        mode: "chords",
      },
      humanization: 0.15,
      patternId: "one-drop",
      swing: 0.2,
    });
    const changes: string[] = [];
    const unsubscribePractice = usePracticeStore.subscribe(() =>
      changes.push("base"),
    );
    const unsubscribeGuided = useGuidedPracticeStore.subscribe(() =>
      changes.push("guided"),
    );
    engine.stop.mockImplementationOnce(() => changes.push("stop"));
    useAudioStore.setState({ status: "playing" });
    usePracticePresetStore.setState({
      presets: [preset],
      recentPresetIds: [preset.id],
    });
    render(<PracticeScreen />);

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );

    await waitFor(() =>
      expect(screen.getByText(`Loaded: ${preset.name}`)).toBeInTheDocument(),
    );
    expect(changes).toEqual(["stop", "base", "guided"]);
    expect(usePracticeStore.getState()).toMatchObject({
      bpm: 112,
      countInMeasures: 2,
      fillFrequency: 8,
      humanization: 0.15,
      selectedPatternId: "one-drop",
      swing: 0.2,
    });
    expect(useGuidedPracticeStore.getState().mode).toBe("chords");
    expect(usePatternStore.getState().recentPatternIds[0]).toBe("one-drop");
    unsubscribePractice();
    unsubscribeGuided();
  });

  it("rejects a preset whose drum pattern is missing without applying anything", async () => {
    const user = userEvent.setup();
    const preset = createPreset("Missing Groove", {
      bpm: 132,
      countInMeasures: 4,
      fillFrequency: "random",
      guidedPractice: { mode: "drums" },
      humanization: 0.3,
      patternId: "deleted-custom-pattern",
      swing: 0.4,
    });
    useAudioStore.setState({ status: "playing" });
    usePracticePresetStore.setState({
      presets: [preset],
      recentPresetIds: [preset.id],
    });
    render(<PracticeScreen />);

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /references a drum pattern that is no longer available/i,
    );
    expect(engine.stop).not.toHaveBeenCalled();
    expect(usePracticeStore.getState()).toMatchObject({
      bpm: 90,
      selectedPatternId: "basic-rock",
    });
    expect(useGuidedPracticeStore.getState().mode).toBe("drums");
    expect(usePatternStore.getState().recentPatternIds).toEqual([]);
  });

  it("rejects a preset whose custom chord progression was deleted", async () => {
    const user = userEvent.setup();
    const preset = createPreset("Missing Changes", {
      bpm: 132,
      countInMeasures: 2,
      fillFrequency: 8,
      guidedPractice: {
        chordTrainer: {
          progression: deletedCustomProgression,
          repeat: false,
          showCountdown: true,
        },
        mode: "chords",
      },
      humanization: 0.3,
      patternId: "one-drop",
      swing: 0.4,
    });
    useAudioStore.setState({ status: "playing" });
    usePracticePresetStore.setState({
      presets: [preset],
      recentPresetIds: [preset.id],
    });
    render(<PracticeScreen />);

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /references a custom chord progression that is no longer available/i,
    );
    expect(engine.stop).not.toHaveBeenCalled();
    expect(usePracticeStore.getState()).toMatchObject({
      bpm: 90,
      selectedPatternId: "basic-rock",
    });
    expect(useGuidedPracticeStore.getState().mode).toBe("drums");
    expect(usePatternStore.getState().recentPatternIds).toEqual([]);
  });

  it("rejects an incompatible strumming preset before either store changes", async () => {
    const user = userEvent.setup();
    const preset = createPreset("Mismatched Strum", {
      bpm: 78,
      countInMeasures: 1,
      fillFrequency: null,
      guidedPractice: {
        mode: "strumming",
        strummingPattern: structuredClone(quarterDownstrokesPattern),
      },
      humanization: 0,
      patternId: "simple-six-eight",
      swing: 0,
    });
    usePracticePresetStore.setState({
      presets: [preset],
      recentPresetIds: [preset.id],
    });
    render(<PracticeScreen />);

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /strumming pattern.*does not match.*drum pattern/i,
    );
    expect(usePracticeStore.getState().selectedPatternId).toBe("basic-rock");
    expect(useGuidedPracticeStore.getState().mode).toBe("drums");
  });

  it("rejects a preset whose custom strumming pattern was deleted", async () => {
    const user = userEvent.setup();
    const preset = createPreset("Missing Strum", {
      bpm: 90,
      countInMeasures: 1,
      fillFrequency: null,
      guidedPractice: {
        mode: "strumming",
        strummingPattern: deletedCustomStrummingPattern,
      },
      humanization: 0,
      patternId: "basic-rock",
      swing: 0,
    });
    usePracticePresetStore.setState({
      presets: [preset],
      recentPresetIds: [preset.id],
    });
    render(<PracticeScreen />);

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /references a custom strumming pattern that is no longer available/i,
    );
    expect(useGuidedPracticeStore.getState().mode).toBe("drums");
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

    await user.click(screen.getByRole("button", { name: "Open presets" }));
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

  it("clears the loaded preset label when base or guided settings change", async () => {
    const user = userEvent.setup();
    const preset = createPreset("Clean Setup", {
      bpm: 90,
      countInMeasures: 1,
      fillFrequency: null,
      guidedPractice: { mode: "drums" },
      humanization: 0,
      patternId: "basic-rock",
      swing: 0,
    });
    usePracticePresetStore.setState({
      presets: [preset],
      recentPresetIds: [preset.id],
    });
    render(<PracticeScreen />);

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );
    expect(screen.getByText(`Loaded: ${preset.name}`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Increase BPM by 1" }));
    expect(screen.queryByText(`Loaded: ${preset.name}`)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );
    expect(screen.getByText(`Loaded: ${preset.name}`)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Tempo/ }));
    expect(screen.queryByText(`Loaded: ${preset.name}`)).toBeNull();
  });

  it("defers the three-column workspace until the xl breakpoint", () => {
    render(<PracticeScreen />);

    const workspace = screen.getByRole("main").querySelector(".grid.flex-1");
    expect(workspace?.className).toContain("xl:grid-cols-");
    expect(workspace?.className).not.toContain("lg:grid-cols-");
  });

  it("rejects an incompatible active guided pattern change", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({ mode: "chords" });
    useAudioStore.setState({ status: "playing" });
    engine.changePattern.mockReturnValueOnce(false);
    render(<PracticeScreen />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Current pattern" }),
      "simple-six-eight",
    );

    expect(usePracticeStore.getState().selectedPatternId).toBe("basic-rock");
    expect(
      screen.getByText(/Stop the active guided session before changing meter/i),
    ).toBeInTheDocument();
  });

  it("surfaces an incompatible stopped strumming setup before playback", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({
      mode: "strumming",
      strummingPattern: structuredClone(quarterDownstrokesPattern),
    });
    usePracticeStore.setState({ selectedPatternId: "simple-six-eight" });
    render(<PracticeScreen />);

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(
      screen.getByText(/Choose a 6\/8 strumming pattern before playing/i),
    ).toBeInTheDocument();
    expect(engine.play).not.toHaveBeenCalled();
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
