"use client";

import { useEffect, useRef, useState } from "react";

import { disposeAudioEngine, getAudioEngine } from "@/audio/audio-engine";
import { builtInPatterns, getPatternById } from "@/data/patterns";
import { usePracticeShortcuts } from "@/hooks/use-practice-shortcuts";
import { usePracticeTimer } from "@/hooks/use-practice-timer";
import { useTapTempo } from "@/hooks/use-tap-tempo";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { isSessionActive } from "@/lib/audio-status";
import { isStrummingPatternMeterCompatible } from "@/lib/guided-practice";
import { clampBpm } from "@/lib/musical-time";
import { arePracticePresetConfigurationsEqual } from "@/lib/practice-preset";
import { validatePracticePresetConfiguration } from "@/lib/practice-validation";
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
import type { FillFrequency, MixerGroup } from "@/types/audio";
import type {
  PracticePreset,
  PracticePresetConfiguration,
} from "@/types/persistence";

const ONBOARDING_KEY = "web-band-onboarding-dismissed";

function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) !== "true";
  } catch {
    return true;
  }
}

function syncMixer(): void {
  getAudioEngine().setMixer(usePracticeStore.getState().mixer);
}

export function usePracticeController() {
  const status = useAudioStore((state) => state.status);
  const errorMessage = useAudioStore((state) => state.errorMessage);
  const bpm = usePracticeStore((state) => state.bpm);
  const countInMeasures = usePracticeStore((state) => state.countInMeasures);
  const fillFrequency = usePracticeStore((state) => state.fillFrequency);
  const humanization = usePracticeStore((state) => state.humanization);
  const masterVolume = usePracticeStore((state) => state.masterVolume);
  const mixer = usePracticeStore((state) => state.mixer);
  const selectedPatternId = usePracticeStore(
    (state) => state.selectedPatternId,
  );
  const swing = usePracticeStore((state) => state.swing);
  const wakeLockEnabled = usePracticeStore((state) => state.wakeLockEnabled);
  const mode = useGuidedPracticeStore((state) => state.mode);
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
  const markRecent = usePatternStore((state) => state.markRecent);
  const [loadedPreset, setLoadedPreset] = useState<{
    configuration: PracticePresetConfiguration;
    name: string;
  } | null>(null);
  const [masterMuted, setMasterMuted] = useState(false);
  const [patternAnnouncement, setPatternAnnouncement] = useState("");
  const [pendingPatternId, setPendingPatternId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const patterns = [...builtInPatterns, ...customPatterns];
  const pattern = getPatternById(selectedPatternId, customPatterns);
  const active = isSessionActive(status);
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
    disabled: shortcutsOpen || openModalCount > 0,
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

  function dismissOnboarding(): void {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // The hint can still be dismissed for the current page when storage is blocked.
    }
    setShowOnboarding(false);
  }

  async function play(): Promise<void> {
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
      markRecent(nextPattern.id);
      setPendingPatternId(null);
      setPatternAnnouncement(`Pattern changed to ${nextPattern.name}.`);
    };

    if (!active) {
      commitPattern();
      return;
    }

    if (getAudioEngine().changePattern(nextPattern, commitPattern)) {
      setPendingPatternId(nextPattern.id);
      setPatternAnnouncement(
        `${nextPattern.name} queued for the next measure.`,
      );
      return;
    }

    const meterChanged =
      nextPattern.timeSignature.numerator !== pattern.timeSignature.numerator ||
      nextPattern.timeSignature.denominator !==
        pattern.timeSignature.denominator;
    setPatternAnnouncement(
      meterChanged && (mode === "chords" || mode === "strumming")
        ? `Pattern change rejected. Stop the active guided session before changing meter to ${nextPattern.timeSignature.numerator}/${nextPattern.timeSignature.denominator}. ${pattern.name} remains selected.`
        : `Pattern change rejected while the session is active. Stop playback and try ${nextPattern.name} again.`,
    );
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
    setPendingPatternId(null);
    getAudioEngine().stop();
  }

  function exitFocusMode(): void {
    setFocusMode(false);
    window.requestAnimationFrame(() => focusButtonRef.current?.focus());
  }

  return {
    active,
    bpm,
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
    focusButtonRef,
    guidedPractice,
    humanization,
    isFocusMode,
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
