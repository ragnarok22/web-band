import { create } from "zustand";

import { gDEmCProgression } from "@/data/chord-progressions";
import { quarterDownstrokesPattern } from "@/data/strumming-patterns";
import { createDefaultMetronomeConfiguration } from "@/lib/metronome";
import { isMetronomeConfiguration } from "@/lib/metronome-validation";
import {
  isChordTrainerConfiguration,
  isGuidedPracticeConfiguration,
  isPracticeMode,
  isStrummingPattern,
  isTempoTrainerConfiguration,
} from "@/lib/practice-validation";
import { reportPreferenceWrite } from "@/stores/storage-store";
import type {
  ChordTrainerConfiguration,
  GuidedPracticeConfiguration,
  PracticeMode,
  StrummingPattern,
  TempoTrainerConfiguration,
  MetronomeConfiguration,
} from "@/types/practice";
import type { GuidedPracticeSettings } from "@/types/persistence";

export const GUIDED_PRACTICE_STORAGE_KEY = "web-band-guided-practice-v1";

export interface GuidedPracticeValues {
  mode: PracticeMode;
  tempoTrainer: TempoTrainerConfiguration;
  chordTrainer: ChordTrainerConfiguration;
  strummingPattern: StrummingPattern;
  metronome: MetronomeConfiguration;
}

interface GuidedPracticeStore extends GuidedPracticeValues {
  isHydrated: boolean;
  applyConfiguration: (configuration: GuidedPracticeConfiguration) => void;
  hydrate: (restoreLastPractice?: boolean) => void;
  replaceSettings: (settings: GuidedPracticeSettings) => boolean;
  setChordTrainerConfiguration: (
    configuration: ChordTrainerConfiguration,
  ) => void;
  setMode: (mode: PracticeMode) => void;
  setMetronomeConfiguration: (configuration: MetronomeConfiguration) => void;
  setStrummingPattern: (pattern: StrummingPattern) => void;
  setTempoTrainerConfiguration: (
    configuration: TempoTrainerConfiguration,
  ) => void;
}

interface PersistedGuidedPracticeState extends GuidedPracticeValues {
  version: 2;
}

export function createDefaultGuidedPracticeValues(): GuidedPracticeValues {
  return {
    metronome: createDefaultMetronomeConfiguration(),
    chordTrainer: {
      progression: structuredClone(gDEmCProgression),
      repeat: true,
      showCountdown: true,
    },
    mode: "drums",
    strummingPattern: structuredClone(quarterDownstrokesPattern),
    tempoTrainer: {
      endBpm: 120,
      increment: 5,
      interval: { measures: 4, type: "measures" },
      resetToStartingBpmOnStop: true,
      startBpm: 80,
      stopAtTarget: true,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadGuidedPracticeValues(): GuidedPracticeValues {
  const defaults = createDefaultGuidedPracticeValues();
  if (typeof window === "undefined") return defaults;

  try {
    const rawValue = window.localStorage.getItem(GUIDED_PRACTICE_STORAGE_KEY);
    const value: unknown = rawValue ? JSON.parse(rawValue) : null;
    if (!isRecord(value) || (value.version !== 1 && value.version !== 2))
      return defaults;

    return {
      metronome:
        value.version === 2 && isMetronomeConfiguration(value.metronome)
          ? structuredClone(value.metronome)
          : defaults.metronome,
      chordTrainer: isChordTrainerConfiguration(value.chordTrainer)
        ? structuredClone(value.chordTrainer)
        : defaults.chordTrainer,
      mode: isPracticeMode(value.mode) ? value.mode : defaults.mode,
      strummingPattern: isStrummingPattern(value.strummingPattern)
        ? structuredClone(value.strummingPattern)
        : defaults.strummingPattern,
      tempoTrainer: isTempoTrainerConfiguration(value.tempoTrainer)
        ? structuredClone(value.tempoTrainer)
        : defaults.tempoTrainer,
    };
  } catch {
    return defaults;
  }
}

function saveGuidedPracticeValues(values: GuidedPracticeValues): boolean {
  if (typeof window === "undefined") return false;

  const persisted: PersistedGuidedPracticeState = {
    metronome: structuredClone(values.metronome),
    chordTrainer: structuredClone(values.chordTrainer),
    mode: values.mode,
    strummingPattern: structuredClone(values.strummingPattern),
    tempoTrainer: structuredClone(values.tempoTrainer),
    version: 2,
  };
  try {
    window.localStorage.setItem(
      GUIDED_PRACTICE_STORAGE_KEY,
      JSON.stringify(persisted),
    );
    return true;
  } catch {
    return false;
  }
}

export function getGuidedPracticeConfiguration(
  values: GuidedPracticeValues,
): GuidedPracticeConfiguration {
  switch (values.mode) {
    case "metronome":
      return {
        mode: "metronome",
        metronome: structuredClone(values.metronome),
      };
    case "drums":
      return { mode: "drums" };
    case "tempoTrainer":
      return {
        mode: "tempoTrainer",
        tempoTrainer: structuredClone(values.tempoTrainer),
      };
    case "chords":
      return {
        chordTrainer: structuredClone(values.chordTrainer),
        mode: "chords",
      };
    case "strumming":
      return {
        mode: "strumming",
        strummingPattern: structuredClone(values.strummingPattern),
      };
  }
}

export const useGuidedPracticeStore = create<GuidedPracticeStore>(
  (set, get) => {
    function update(changes: Partial<GuidedPracticeValues>): void {
      set(changes);
      reportPreferenceWrite("guided practice", saveGuidedPracticeValues(get()));
    }

    return {
      ...createDefaultGuidedPracticeValues(),
      applyConfiguration: (configuration) => {
        if (!isGuidedPracticeConfiguration(configuration)) {
          throw new Error("Guided practice configuration is invalid.");
        }

        switch (configuration.mode) {
          case "metronome":
            update({
              mode: "metronome",
              metronome: structuredClone(configuration.metronome),
            });
            break;
          case "drums":
            update({ mode: "drums" });
            break;
          case "tempoTrainer":
            update({
              mode: "tempoTrainer",
              tempoTrainer: structuredClone(configuration.tempoTrainer),
            });
            break;
          case "chords":
            update({
              chordTrainer: structuredClone(configuration.chordTrainer),
              mode: "chords",
            });
            break;
          case "strumming":
            update({
              mode: "strumming",
              strummingPattern: structuredClone(configuration.strummingPattern),
            });
            break;
        }
      },
      hydrate: (restoreLastPractice = true) =>
        set({
          ...(restoreLastPractice
            ? loadGuidedPracticeValues()
            : createDefaultGuidedPracticeValues()),
          isHydrated: true,
        }),
      isHydrated: false,
      replaceSettings: (settings) => {
        if (
          !isPracticeMode(settings.mode) ||
          !isTempoTrainerConfiguration(settings.tempoTrainer) ||
          !isChordTrainerConfiguration(settings.chordTrainer) ||
          !isStrummingPattern(settings.strummingPattern) ||
          !isMetronomeConfiguration(settings.metronome)
        ) {
          throw new Error("Guided practice settings are invalid.");
        }
        const next = structuredClone(settings);
        set(next);
        const persisted = saveGuidedPracticeValues(next);
        reportPreferenceWrite("guided practice", persisted);
        return persisted;
      },
      setChordTrainerConfiguration: (chordTrainer) => {
        if (!isChordTrainerConfiguration(chordTrainer)) {
          throw new Error("Chord trainer configuration is invalid.");
        }
        update({ chordTrainer: structuredClone(chordTrainer) });
      },
      setMode: (mode) => {
        if (!isPracticeMode(mode)) {
          throw new Error("Guided practice mode is invalid.");
        }
        update({ mode });
      },
      setMetronomeConfiguration: (metronome) => {
        if (!isMetronomeConfiguration(metronome))
          throw new Error("Metronome configuration is invalid.");
        update({ metronome: structuredClone(metronome) });
      },
      setStrummingPattern: (strummingPattern) => {
        if (!isStrummingPattern(strummingPattern)) {
          throw new Error("Strumming pattern is invalid.");
        }
        update({ strummingPattern: structuredClone(strummingPattern) });
      },
      setTempoTrainerConfiguration: (tempoTrainer) => {
        if (!isTempoTrainerConfiguration(tempoTrainer)) {
          throw new Error("Tempo trainer configuration is invalid.");
        }
        update({ tempoTrainer: structuredClone(tempoTrainer) });
      },
    };
  },
);
