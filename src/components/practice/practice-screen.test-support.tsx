import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { guidanceTimeline } from "@/audio/guidance-timeline";
import { metronomeTimeline } from "@/audio/metronome-timeline";
import { builtInPatterns } from "@/data/patterns";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { useAudioStore } from "@/stores/audio-store";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import {
  createDefaultGuidedPracticeValues,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePracticeUiStore } from "@/stores/practice-ui-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";
import { useStorageStore } from "@/stores/storage-store";
import type { PracticePreset } from "@/types/persistence";

export async function selectQuickPattern(
  user: ReturnType<typeof userEvent.setup>,
  id: string,
) {
  const pattern = builtInPatterns.find((item) => item.id === id)!;
  await user.click(
    screen.getByRole("button", { name: /Change Pattern|Change Groove/ }),
  );
  const input = screen.getByRole("combobox", { name: "Current pattern" });
  await user.clear(input);
  await user.type(input, pattern.name);
  await user.click(
    await screen.findByRole("option", {
      name: `${pattern.name} - ${pattern.timeSignature.numerator}/${pattern.timeSignature.denominator}`,
    }),
  );
}

const engine = vi.hoisted(() => ({
  changePattern: vi.fn((...arguments_: [unknown?, (() => void)?, string?]) => {
    void arguments_;
    return false;
  }),
  pause: vi.fn(),
  play: vi.fn(() => Promise.resolve()),
  queueStopWithFill: vi.fn(() => true),
  setBpm: vi.fn(),
  setFillFrequency: vi.fn(),
  setHumanization: vi.fn(),
  setMasterVolume: vi.fn(),
  setMixer: vi.fn(),
  setSwing: vi.fn(),
  stop: vi.fn(),
  updateMetronome: vi.fn(),
}));

export function createPreset(
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

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: vi.fn(),
  getAudioEngine: () => engine,
}));

export function setupPracticeScreenTests() {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "wakeLock");
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    guidanceTimeline.reset();
    metronomeTimeline.reset();
    useAudioStore.setState({ errorMessage: null, status: "not-initialized" });
    useStorageStore.setState({ preferenceWriteFailures: [] });
    useGuidedPracticeStore.setState({
      ...createDefaultGuidedPracticeValues(),
      isHydrated: true,
    });
    useChordProgressionStore.setState({
      customProgressions: [],
      favoriteProgressionIds: [],
      isHydrated: true,
    });
    useStrummingPatternStore.setState({ customPatterns: [], isHydrated: true });
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
}

export { engine };
