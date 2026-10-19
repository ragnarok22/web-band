import {
  engine,
  createPreset,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { openPresetMenu } from "@/test/open-preset-menu";
import { gDEmCProgression } from "@/data/chord-progressions";
import { quarterDownstrokesPattern } from "@/data/strumming-patterns";
import { useAudioStore } from "@/stores/audio-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { renderWithMotion as render } from "@/test/render-with-motion";
import type {
  CustomChordProgression,
  CustomStrummingPattern,
} from "@/types/persistence";

const deletedCustomProgression: CustomChordProgression = {
  createdAt: "2026-07-18T10:00:00.000Z",
  id: "deleted-custom-progression",
  isBuiltIn: false,
  name: "Deleted changes",
  steps: [
    { chord: "Am", duration: 1, durationUnit: "measures", id: "deleted-am" },
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

describe("practice screen — presets", () => {
  setupPracticeScreenTests();

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
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
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
    expect(screen.getByTestId("practice-live-region")).toHaveTextContent(
      "Loaded Chord Builder: One Drop, 112 BPM.",
    );
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
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
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
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
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
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
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
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /references a custom strumming pattern that is no longer available/i,
    );
    expect(useGuidedPracticeStore.getState().mode).toBe("drums");
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
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );
    expect(screen.getByText(`Loaded: ${preset.name}`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Increase BPM by 1" }));
    expect(screen.queryByText(`Loaded: ${preset.name}`)).toBeNull();
    await openPresetMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Manage presets" }));
    await user.click(
      screen.getByRole("button", { name: `Load ${preset.name}` }),
    );
    expect(screen.getByText(`Loaded: ${preset.name}`)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Tempo/ }));
    expect(screen.queryByText(`Loaded: ${preset.name}`)).toBeNull();
  });
});
