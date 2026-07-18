"use client";

import { useEffect, useRef, useState } from "react";

import { disposeAudioEngine, getAudioEngine } from "@/audio/audio-engine";
import { BeatVisualizer } from "@/components/practice/beat-visualizer";
import { CompactMixer } from "@/components/practice/compact-mixer";
import { PatternSummary } from "@/components/practice/pattern-summary";
import { PracticeFocusSession } from "@/components/practice/practice-focus-session";
import { PracticeHeader } from "@/components/practice/practice-header";
import { PracticeNotices } from "@/components/practice/practice-notices";
import { PracticeSettings } from "@/components/practice/practice-settings";
import { SessionToolbar } from "@/components/practice/session-toolbar";
import { ShortcutsDialog } from "@/components/practice/shortcuts-dialog";
import { TransportPanel } from "@/components/practice/transport-panel";
import { builtInPatterns, getPatternById } from "@/data/patterns";
import { usePracticeShortcuts } from "@/hooks/use-practice-shortcuts";
import { usePracticeTimer } from "@/hooks/use-practice-timer";
import { useTapTempo } from "@/hooks/use-tap-tempo";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { audioStatusCopy } from "@/lib/audio-status";
import { clampBpm } from "@/lib/musical-time";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePracticeUiStore } from "@/stores/practice-ui-store";
import type { FillFrequency, MixerGroup } from "@/types/audio";

const ONBOARDING_KEY = "web-band-onboarding-dismissed";

function syncMixer(): void {
  getAudioEngine().setMixer(usePracticeStore.getState().mixer);
}

function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(ONBOARDING_KEY) !== "true";
  } catch {
    return true;
  }
}

export function PracticeScreen() {
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
  const setBpm = usePracticeStore((state) => state.setBpm);
  const setCountInMeasures = usePracticeStore(
    (state) => state.setCountInMeasures,
  );
  const setFillFrequency = usePracticeStore((state) => state.setFillFrequency);
  const setHumanization = usePracticeStore((state) => state.setHumanization);
  const setMasterVolume = usePracticeStore((state) => state.setMasterVolume);
  const setMixerMuted = usePracticeStore((state) => state.setMixerMuted);
  const setMixerSolo = usePracticeStore((state) => state.setMixerSolo);
  const setMixerVolume = usePracticeStore((state) => state.setMixerVolume);
  const resetMixer = usePracticeStore((state) => state.resetMixer);
  const setSelectedPatternId = usePracticeStore(
    (state) => state.setSelectedPatternId,
  );
  const swing = usePracticeStore((state) => state.swing);
  const setSwing = usePracticeStore((state) => state.setSwing);
  const wakeLockEnabled = usePracticeStore((state) => state.wakeLockEnabled);
  const setWakeLockEnabled = usePracticeStore(
    (state) => state.setWakeLockEnabled,
  );
  const isFocusMode = usePracticeUiStore((state) => state.isFocusMode);
  const setFocusMode = usePracticeUiStore((state) => state.setFocusMode);
  const customPatterns = usePatternStore((state) => state.customPatterns);
  const markRecent = usePatternStore((state) => state.markRecent);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const [pendingPatternId, setPendingPatternId] = useState<string | null>(null);
  const [patternAnnouncement, setPatternAnnouncement] = useState("");
  const [masterMuted, setMasterMuted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const patterns = [...builtInPatterns, ...customPatterns];
  const pattern = getPatternById(selectedPatternId, customPatterns);
  const elapsedSeconds = usePracticeTimer(status);
  const wakeLockStatus = useWakeLock(wakeLockEnabled, status);
  const tapTempo = useTapTempo(changeBpm);

  useEffect(() => {
    return () => {
      setFocusMode(false);
      disposeAudioEngine();
    };
  }, [setFocusMode]);

  usePracticeShortcuts({
    disabled: shortcutsOpen,
    onBpmChange: (amount) => changeBpm(bpm + amount),
    onFocusToggle: () => {
      if (isFocusMode) exitFocusMode();
      else setFocusMode(true);
    },
    onMasterMuteToggle: toggleMasterMute,
    onPlay: () => void play(),
    onStop: stop,
    onTapTempo: tapTempo,
    status,
  });

  function changeBpm(value: number): void {
    const nextBpm = clampBpm(value, bpm);
    setBpm(nextBpm);
    if (status !== "not-initialized" && status !== "error") {
      getAudioEngine().setBpm(nextBpm);
    }
  }

  function changeMasterVolume(volume: number): void {
    setMasterVolume(volume);
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
    setMixerVolume(group, volume);
    syncMixer();
  }

  function changeMixerMuted(group: MixerGroup, muted: boolean): void {
    setMixerMuted(group, muted);
    syncMixer();
  }

  function changeMixerSolo(group: MixerGroup, solo: boolean): void {
    setMixerSolo(group, solo);
    syncMixer();
  }

  function restoreMixer(): void {
    resetMixer();
    syncMixer();
  }

  function changeSwing(amount: number): void {
    setSwing(amount);
    getAudioEngine().setSwing(amount);
  }

  function changeHumanization(amount: number): void {
    setHumanization(amount);
    getAudioEngine().setHumanization(amount);
  }

  function changeFillFrequency(frequency: FillFrequency): void {
    setFillFrequency(frequency);
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
    markRecent(pattern.id);
    try {
      await getAudioEngine().play({
        bpm,
        countInMeasures,
        fillFrequency,
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

    const commitPattern = (changedPattern: typeof nextPattern) => {
      setSelectedPatternId(changedPattern.id);
      markRecent(changedPattern.id);
      setPendingPatternId(null);
      setPatternAnnouncement(`Pattern changed to ${changedPattern.name}.`);
    };

    if (getAudioEngine().changePattern(nextPattern, commitPattern)) {
      setPendingPatternId(nextPattern.id);
      setPatternAnnouncement(
        `${nextPattern.name} queued for the next measure.`,
      );
    } else {
      commitPattern(nextPattern);
    }
  }

  function stop(): void {
    setPendingPatternId(null);
    getAudioEngine().stop();
  }

  function exitFocusMode(): void {
    setFocusMode(false);
    window.requestAnimationFrame(() => focusButtonRef.current?.focus());
  }

  if (isFocusMode) {
    return (
      <PracticeFocusSession
        bpm={bpm}
        countInMeasures={countInMeasures}
        elapsedSeconds={elapsedSeconds}
        onExit={exitFocusMode}
        onPlay={() => void play()}
        onShortcutsClose={() => setShortcutsOpen(false)}
        onStop={stop}
        pattern={pattern}
        shortcutsOpen={shortcutsOpen}
        status={status}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[92rem] flex-col px-3 pb-8 sm:px-6 lg:px-8">
      <PracticeHeader status={status} />

      <div className="grid flex-1 gap-4 pt-4 lg:grid-cols-[minmax(16rem,0.78fr)_minmax(25rem,1.5fr)_minmax(16rem,0.78fr)] lg:items-start lg:gap-5 lg:pt-6">
        <aside className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
          <PatternSummary
            onPatternChange={changePattern}
            pattern={pattern}
            patterns={patterns}
            pendingPatternId={pendingPatternId}
            swing={swing}
          />

          <CompactMixer
            masterMuted={masterMuted}
            masterVolume={masterVolume}
            mixer={mixer}
            onMasterMuteToggle={toggleMasterMute}
            onMasterVolumeChange={changeMasterVolume}
            onMutedChange={changeMixerMuted}
            onReset={restoreMixer}
            onSoloChange={changeMixerSolo}
            onVolumeChange={changeMixerVolume}
          />
        </aside>

        <section className="order-1 flex flex-col gap-5 lg:order-2">
          <SessionToolbar
            elapsedSeconds={elapsedSeconds}
            focusButtonRef={focusButtonRef}
            onFocus={() => setFocusMode(true)}
            onShortcuts={() => setShortcutsOpen(true)}
            onWakeLockChange={setWakeLockEnabled}
            wakeLockEnabled={wakeLockEnabled}
            wakeLockStatus={wakeLockStatus}
          />
          <BeatVisualizer
            countInMeasures={countInMeasures}
            pattern={pattern}
            status={status}
          />

          <TransportPanel
            onPause={() => getAudioEngine().pause()}
            onPlay={() => void play()}
            onStop={stop}
            status={status}
          />

          <PracticeNotices
            countInMeasures={countInMeasures}
            errorMessage={errorMessage}
            onDismiss={dismissOnboarding}
            showOnboarding={showOnboarding}
          />
        </section>

        <PracticeSettings
          bpm={bpm}
          countInMeasures={countInMeasures}
          defaultBpm={pattern.defaultBpm}
          fillFrequency={fillFrequency}
          humanization={humanization}
          onBpmChange={changeBpm}
          onCountInChange={setCountInMeasures}
          onFillFrequencyChange={changeFillFrequency}
          onHumanizationChange={changeHumanization}
          onSwingChange={changeSwing}
          onTapTempo={tapTempo}
          status={status}
          swing={swing}
          timeSignature={pattern.timeSignature}
        />
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {audioStatusCopy[status]}
      </p>
      <p aria-live="polite" className="sr-only" role="status">
        {patternAnnouncement}
      </p>
      <ShortcutsDialog
        onClose={() => setShortcutsOpen(false)}
        open={shortcutsOpen}
      />
    </main>
  );
}
