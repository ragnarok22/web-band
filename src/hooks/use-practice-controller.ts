"use client";

import { useEffect, useRef, useState } from "react";

import { disposeAudioEngine, getAudioEngine } from "@/audio/audio-engine";
import { builtInPatterns, getPatternById } from "@/data/patterns";
import { getBuiltInStrummingPattern } from "@/data/strumming-patterns";
import {
  saveOnboardingDismissal,
  shouldShowOnboarding,
} from "@/db/repositories/onboarding-preferences-repository";
import { usePracticeShortcuts } from "@/hooks/use-practice-shortcuts";
import { usePracticeHistoryRecorder } from "@/hooks/use-practice-history-recorder";
import { usePracticeTimer } from "@/hooks/use-practice-timer";
import { useTapTempo } from "@/hooks/use-tap-tempo";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { isSessionActive } from "@/lib/audio-status";
import { isStrummingPatternMeterCompatible } from "@/lib/guided-practice";
import { clampBpm } from "@/lib/musical-time";
import { arePracticePresetConfigurationsEqual } from "@/lib/practice-preset";
import {
  validateGuidedPracticeConfiguration,
  validatePracticePresetConfiguration,
} from "@/lib/practice-validation";
import { validatePattern } from "@/lib/pattern-validation";
import { useAudioStore } from "@/stores/audio-store";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import {
  getGuidedPracticeConfiguration,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePracticeUiStore } from "@/stores/practice-ui-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";
import { reportPreferenceWrite } from "@/stores/storage-store";
import type { FillFrequency, MixerGroup } from "@/types/audio";
import type {
  PracticePreset,
  PracticePresetConfiguration,
} from "@/types/persistence";

function syncMixer(): void {
  getAudioEngine().setMixer(usePracticeStore.getState().mixer);
}

function changeMixerVolume(group: MixerGroup, volume: number): void {
  usePracticeStore.getState().setMixerVolume(group, volume);
  syncMixer();
}

function changeMixerMuted(group: MixerGroup, muted: boolean): void {
  usePracticeStore.getState().setMixerMuted(group, muted);
  syncMixer();
}

function changeMixerSolo(group: MixerGroup, solo: boolean): void {
  usePracticeStore.getState().setMixerSolo(group, solo);
  syncMixer();
}

function restoreMixer(): void {
  usePracticeStore.getState().resetMixer();
  syncMixer();
}

function changeSwing(amount: number): void {
  usePracticeStore.getState().setSwing(amount);
  getAudioEngine().setSwing(amount);
}

function changeHumanization(amount: number): void {
  usePracticeStore.getState().setHumanization(amount);
  getAudioEngine().setHumanization(amount);
}

function changeFillFrequency(frequency: FillFrequency): void {
  usePracticeStore.getState().setFillFrequency(frequency);
  getAudioEngine().setFillFrequency(frequency);
}

export function usePracticeController() {
  const status = useAudioStore((state) => state.status);
  const errorMessage = useAudioStore((state) => state.errorMessage);
  const bpm = usePracticeStore((state) => state.bpm);
  const bpmAdjustmentStep = usePracticeStore(
    (state) => state.bpmAdjustmentStep,
  );
  const practiceHydrated = usePracticeStore((state) => state.hasHydrated);
  const countInMeasures = usePracticeStore((state) => state.countInMeasures);
  const fillFrequency = usePracticeStore((state) => state.fillFrequency);
  const humanization = usePracticeStore((state) => state.humanization);
  const masterVolume = usePracticeStore((state) => state.masterVolume);
  const mixer = usePracticeStore((state) => state.mixer);
  const selectedPatternId = usePracticeStore(
    (state) => state.selectedPatternId,
  );
  const soundCharacter = usePracticeStore((state) => state.soundCharacter);
  const swing = usePracticeStore((state) => state.swing);
  const wakeLockEnabled = usePracticeStore((state) => state.wakeLockEnabled);
  const mode = useGuidedPracticeStore((state) => state.mode);
  const guidedPracticeHydrated = useGuidedPracticeStore(
    (state) => state.isHydrated,
  );
  const tempoTrainer = useGuidedPracticeStore((state) => state.tempoTrainer);
  const chordTrainer = useGuidedPracticeStore((state) => state.chordTrainer);
  const strummingPattern = useGuidedPracticeStore(
    (state) => state.strummingPattern,
  );
  const isFocusMode = usePracticeUiStore((state) => state.isFocusMode);
  const openModalCount = usePracticeUiStore((state) => state.openModalCount);
  const setFocusMode = usePracticeUiStore((state) => state.setFocusMode);
  const customProgressions = useChordProgressionStore(
    (state) => state.customProgressions,
  );
  const chordProgressionsHydrated = useChordProgressionStore(
    (state) => state.isHydrated,
  );
  const customPatterns = usePatternStore((state) => state.customPatterns);
  const patternsHydrated = usePatternStore((state) => state.isHydrated);
  const markRecent = usePatternStore((state) => state.markRecent);
  const customStrummingPatterns = useStrummingPatternStore(
    (state) => state.customPatterns,
  );
  const strummingPatternsHydrated = useStrummingPatternStore(
    (state) => state.isHydrated,
  );
  const [loadedPreset, setLoadedPreset] = useState<{
    configuration: PracticePresetConfiguration;
    name: string;
  } | null>(null);
  const [masterMuted, setMasterMuted] = useState(false);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [immediatePatternSwitch, setImmediatePatternSwitch] = useState(false);
  const [finishRequested, setFinishRequested] = useState(false);
  const [patternAnnouncement, setPatternAnnouncement] = useState("");
  const [pendingPatternId, setPendingPatternId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const patterns = [...builtInPatterns, ...customPatterns];
  const pattern = getPatternById(selectedPatternId, customPatterns);
  const active = isSessionActive(status);
  const isFinishing = active && finishRequested;
  const isReady =
    practiceHydrated &&
    guidedPracticeHydrated &&
    patternsHydrated &&
    strummingPatternsHydrated;
  const guidedPractice = getGuidedPracticeConfiguration({
    chordTrainer,
    mode,
    strummingPattern,
    tempoTrainer,
  });
  const presetConfiguration: PracticePresetConfiguration = {
    bpm,
    countInMeasures,
    fillFrequency,
    guidedPractice,
    humanization,
    patternId: pattern.id,
    swing,
  };
  const loadedPresetName =
    loadedPreset &&
    arePracticePresetConfigurationsEqual(
      presetConfiguration,
      loadedPreset.configuration,
    )
      ? loadedPreset.name
      : null;
  const elapsedSeconds = usePracticeTimer(status);
  const wakeLockStatus = useWakeLock(wakeLockEnabled, status);

  usePracticeHistoryRecorder({
    bpm,
    guidedPractice,
    onSaveError: () =>
      setHistoryNotice(
        "This session could not be added to practice history. Playback was not interrupted.",
      ),
    onSaveSuccess: () => setHistoryNotice(null),
    pattern,
    status,
  });

  function changeBpm(value: number): void {
    const nextBpm = clampBpm(value, bpm);
    usePracticeStore.getState().setBpm(nextBpm);
    if (status !== "not-initialized" && status !== "error") {
      getAudioEngine().setBpm(nextBpm);
    }
  }

  function changeTrainerBpm(value: number): void {
    if (active) return;
    useGuidedPracticeStore.getState().setTempoTrainerConfiguration({
      ...tempoTrainer,
      startBpm: clampBpm(value, tempoTrainer.startBpm),
    });
  }

  function applyTappedBpm(value: number): void {
    if (mode === "tempoTrainer") changeTrainerBpm(value);
    else changeBpm(value);
  }

  const tapTempo = useTapTempo(applyTappedBpm);

  useEffect(() => {
    return () => {
      setFocusMode(false);
      disposeAudioEngine();
    };
  }, [setFocusMode]);

  usePracticeShortcuts({
    adjustmentStep: bpmAdjustmentStep,
    disabled: !isReady || shortcutsOpen || openModalCount > 0,
    onBpmChange: (amount) => {
      if (mode === "tempoTrainer")
        changeTrainerBpm(tempoTrainer.startBpm + amount);
      else changeBpm(bpm + amount);
    },
    onFocusToggle: () => {
      if (isFocusMode) exitFocusMode();
      else setFocusMode(true);
    },
    onMasterMuteToggle: toggleMasterMute,
    onPatternChange: changePatternByOffset,
    onPause: () => getAudioEngine().pause(),
    onPlay: () => void play(),
    onStop: stop,
    onTapTempo: () => {
      if (mode !== "tempoTrainer" || !active) tapTempo();
    },
    status,
  });

  function changeMasterVolume(volume: number): void {
    usePracticeStore.getState().setMasterVolume(volume);
    getAudioEngine().setMasterVolume(masterMuted ? 0 : volume);
  }

  function toggleMasterMute(): void {
    setMasterMuted((muted) => {
      const nextMuted = !muted;
      getAudioEngine().setMasterVolume(nextMuted ? 0 : masterVolume);
      return nextMuted;
    });
  }

  function dismissOnboarding(): void {
    reportPreferenceWrite("onboarding", saveOnboardingDismissal());
    setShowOnboarding(false);
  }

  async function play(): Promise<void> {
    if (!isReady) return;
    setFinishRequested(false);
    const guidedValidation =
      validateGuidedPracticeConfiguration(guidedPractice);
    if (!guidedValidation.success) {
      useAudioStore
        .getState()
        .setError(
          `Guided practice is invalid: ${guidedValidation.errors.join(" ")}`,
        );
      return;
    }
    if (
      guidedPractice.mode === "tempoTrainer" &&
      guidedPractice.tempoTrainer.startBpm ===
        guidedPractice.tempoTrainer.endBpm
    ) {
      useAudioStore
        .getState()
        .setError("Starting and target BPM must be different.");
      return;
    }
    if (
      guidedPractice.mode === "strumming" &&
      (guidedPractice.strummingPattern.isBuiltIn
        ? !getBuiltInStrummingPattern(guidedPractice.strummingPattern.id)
        : !customStrummingPatterns.some(
            ({ id }) => id === guidedPractice.strummingPattern.id,
          ))
    ) {
      useAudioStore
        .getState()
        .setError("The selected strumming pattern is no longer available.");
      return;
    }
    if (
      guidedPractice.mode === "strumming" &&
      !isStrummingPatternMeterCompatible(
        guidedPractice.strummingPattern,
        pattern.timeSignature,
      )
    ) {
      useAudioStore
        .getState()
        .setError(
          `Choose a ${pattern.timeSignature.numerator}/${pattern.timeSignature.denominator} strumming pattern before playing ${pattern.name}.`,
        );
      return;
    }

    markRecent(pattern.id);
    try {
      await getAudioEngine().play({
        bpm,
        countInMeasures,
        fillFrequency,
        guidedPractice,
        humanization,
        masterVolume: masterMuted ? 0 : masterVolume,
        mixer,
        pattern,
        soundCharacter,
        swing,
      });
    } catch {
      // The engine records and exposes a user-facing error through the audio store.
    }
  }

  function changePattern(patternId: string): void {
    const nextPattern = patterns.find(
      (candidate) => candidate.id === patternId,
    );
    if (!nextPattern || nextPattern.id === pattern.id) return;

    const commitPattern = () => {
      usePracticeStore.getState().setSelectedPatternId(nextPattern.id);
      usePracticeStore.getState().setSwing(nextPattern.swing ?? 0);
      markRecent(nextPattern.id);
      setPendingPatternId(null);
      setPatternAnnouncement(`Pattern changed to ${nextPattern.name}.`);
    };

    if (!active) {
      commitPattern();
      return;
    }

    const meterChanged =
      nextPattern.timeSignature.numerator !== pattern.timeSignature.numerator ||
      nextPattern.timeSignature.denominator !==
        pattern.timeSignature.denominator;
    const changeImmediately = immediatePatternSwitch && !meterChanged;
    const changeMode = changeImmediately ? "immediate" : "fill";

    if (
      getAudioEngine().changePattern(nextPattern, commitPattern, changeMode)
    ) {
      if (changeImmediately) return;
      setPendingPatternId(nextPattern.id);
      setPatternAnnouncement(
        `${nextPattern.name} queued after a transition fill.`,
      );
      return;
    }

    setPatternAnnouncement(
      meterChanged && (mode === "chords" || mode === "strumming")
        ? `Pattern change rejected. Stop the active guided session before changing meter to ${nextPattern.timeSignature.numerator}/${nextPattern.timeSignature.denominator}. ${pattern.name} remains selected.`
        : `Pattern change rejected while the session is active. Stop playback and try ${nextPattern.name} again.`,
    );
  }

  function changePatternByOffset(direction: -1 | 1): void {
    if (patterns.length < 2) return;
    const selectedIndex = patterns.findIndex(
      ({ id }) => id === (pendingPatternId ?? pattern.id),
    );
    const nextIndex =
      (Math.max(0, selectedIndex) + direction + patterns.length) %
      patterns.length;
    const nextPattern = patterns[nextIndex];
    if (nextPattern) changePattern(nextPattern.id);
  }

  function loadPreset(preset: PracticePreset): void {
    const validation = validatePracticePresetConfiguration(
      preset.configuration,
    );
    if (!validation.success) {
      throw new Error(
        `${preset.name} has an invalid practice configuration: ${validation.errors.join(" ")}`,
      );
    }

    const nextPattern = patterns.find(
      (candidate) => candidate.id === preset.configuration.patternId,
    );
    if (!nextPattern) {
      throw new Error(
        `${preset.name} references a drum pattern that is no longer available.`,
      );
    }
    const patternValidation = validatePattern(nextPattern);
    if (!patternValidation.success) {
      throw new Error(`${preset.name} references an invalid drum pattern.`);
    }
    const nextGuidedPractice = preset.configuration.guidedPractice;
    if (
      nextGuidedPractice.mode === "chords" &&
      !nextGuidedPractice.chordTrainer.progression.isBuiltIn
    ) {
      if (!chordProgressionsHydrated) {
        throw new Error(
          `${preset.name}'s custom chord progression is still loading. Try again in a moment.`,
        );
      }
      if (
        !customProgressions.some(
          ({ id }) => id === nextGuidedPractice.chordTrainer.progression.id,
        )
      ) {
        throw new Error(
          `${preset.name} references a custom chord progression that is no longer available.`,
        );
      }
    }
    if (
      nextGuidedPractice.mode === "strumming" &&
      !nextGuidedPractice.strummingPattern.isBuiltIn
    ) {
      if (!strummingPatternsHydrated) {
        throw new Error(
          `${preset.name}'s custom strumming pattern is still loading. Try again in a moment.`,
        );
      }
      if (
        !customStrummingPatterns.some(
          ({ id }) => id === nextGuidedPractice.strummingPattern.id,
        )
      ) {
        throw new Error(
          `${preset.name} references a custom strumming pattern that is no longer available.`,
        );
      }
    }
    if (
      nextGuidedPractice.mode === "strumming" &&
      !isStrummingPatternMeterCompatible(
        nextGuidedPractice.strummingPattern,
        nextPattern.timeSignature,
      )
    ) {
      throw new Error(
        `${preset.name}'s strumming pattern does not match its ${nextPattern.timeSignature.numerator}/${nextPattern.timeSignature.denominator} drum pattern.`,
      );
    }

    if (active) getAudioEngine().stop();
    usePracticeStore.getState().applyConfiguration(preset.configuration);
    useGuidedPracticeStore.getState().applyConfiguration(nextGuidedPractice);
    markRecent(nextPattern.id);
    setLoadedPreset({
      configuration: structuredClone(preset.configuration),
      name: preset.name,
    });
  }

  function stop(): void {
    setFinishRequested(false);
    setPendingPatternId(null);
    getAudioEngine().stop();
  }

  function finishWithFill(): void {
    if (!getAudioEngine().queueStopWithFill()) return;
    setFinishRequested(true);
    setPendingPatternId(null);
    setPatternAnnouncement("Finishing after a transition fill.");
  }

  function exitFocusMode(): void {
    setFocusMode(false);
    window.requestAnimationFrame(() => focusButtonRef.current?.focus());
  }

  return {
    active,
    bpm,
    bpmAdjustmentStep,
    changeBpm,
    changeFillFrequency,
    changeHumanization,
    changeMasterVolume,
    changeMixerMuted,
    changeMixerSolo,
    changeMixerVolume,
    changePattern,
    changeSwing,
    countInMeasures,
    dismissOnboarding,
    elapsedSeconds,
    errorMessage,
    exitFocusMode,
    fillFrequency,
    finishWithFill,
    focusButtonRef,
    guidedPractice,
    humanization,
    historyNotice,
    immediatePatternSwitch,
    isFinishing,
    isFocusMode,
    isReady,
    loadPreset,
    loadedPresetName,
    masterMuted,
    masterVolume,
    mixer,
    pattern,
    patternAnnouncement,
    patterns,
    pause: () => getAudioEngine().pause(),
    pendingPatternId,
    play,
    presetConfiguration,
    resetMixer: restoreMixer,
    setCountInMeasures: usePracticeStore.getState().setCountInMeasures,
    setFocusMode,
    setImmediatePatternSwitch,
    setShortcutsOpen,
    setWakeLockEnabled: usePracticeStore.getState().setWakeLockEnabled,
    shortcutsOpen,
    showOnboarding,
    status,
    stop,
    swing,
    tapTempo,
    toggleMasterMute,
    wakeLockEnabled,
    wakeLockStatus,
  };
}
