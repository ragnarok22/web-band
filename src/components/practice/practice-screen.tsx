"use client";

import { BeatVisualizer } from "@/components/practice/beat-visualizer";
import { CompactMixer } from "@/components/practice/compact-mixer";
import { GuidedPracticeDisplay } from "@/components/practice/guided-practice-display";
import { PatternSummary } from "@/components/practice/pattern-summary";
import { PracticeFocusSession } from "@/components/practice/practice-focus-session";
import { PracticeHeader } from "@/components/practice/practice-header";
import { PracticeNotices } from "@/components/practice/practice-notices";
import { PracticePresetBar } from "@/components/practice/practice-preset-bar";
import { PracticeSettings } from "@/components/practice/practice-settings";
import { SessionToolbar } from "@/components/practice/session-toolbar";
import { ShortcutsDialog } from "@/components/practice/shortcuts-dialog";
import { TransportPanel } from "@/components/practice/transport-panel";
import { usePracticeController } from "@/hooks/use-practice-controller";
import { audioStatusCopy } from "@/lib/audio-status";

export function PracticeScreen() {
  const practice = usePracticeController();

  if (practice.isFocusMode) {
    return (
      <PracticeFocusSession
        bpm={practice.bpm}
        configuration={practice.guidedPractice}
        countInMeasures={practice.countInMeasures}
        elapsedSeconds={practice.elapsedSeconds}
        errorMessage={practice.errorMessage}
        onDismissNotice={practice.dismissOnboarding}
        onExit={practice.exitFocusMode}
        onPlay={() => void practice.play()}
        onShortcutsClose={() => practice.setShortcutsOpen(false)}
        onStop={practice.stop}
        pattern={practice.pattern}
        showOnboarding={practice.showOnboarding}
        shortcutsOpen={practice.shortcutsOpen}
        status={practice.status}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[92rem] flex-col px-3 pb-8 sm:px-6 lg:px-8">
      <PracticeHeader status={practice.status} />
      <div className="pt-4 lg:pt-6">
        <PracticePresetBar
          configuration={practice.presetConfiguration}
          loadedPresetName={practice.loadedPresetName}
          onLoad={practice.loadPreset}
        />
      </div>

      <div className="grid flex-1 gap-4 pt-4 xl:grid-cols-[minmax(16rem,0.78fr)_minmax(25rem,1.5fr)_minmax(16rem,0.78fr)] xl:items-start xl:gap-5">
        <aside className="order-2 grid gap-4 sm:grid-cols-2 xl:order-1 xl:grid-cols-1">
          <PatternSummary
            onPatternChange={practice.changePattern}
            pattern={practice.pattern}
            patterns={practice.patterns}
            pendingPatternId={practice.pendingPatternId}
            swing={practice.swing}
          />

          <CompactMixer
            masterMuted={practice.masterMuted}
            masterVolume={practice.masterVolume}
            mixer={practice.mixer}
            onMasterMuteToggle={practice.toggleMasterMute}
            onMasterVolumeChange={practice.changeMasterVolume}
            onMutedChange={practice.changeMixerMuted}
            onReset={practice.resetMixer}
            onSoloChange={practice.changeMixerSolo}
            onVolumeChange={practice.changeMixerVolume}
          />
        </aside>

        <section className="order-1 flex flex-col gap-5 xl:order-2">
          <SessionToolbar
            elapsedSeconds={practice.elapsedSeconds}
            focusButtonRef={practice.focusButtonRef}
            onFocus={() => practice.setFocusMode(true)}
            onShortcuts={() => practice.setShortcutsOpen(true)}
            onWakeLockChange={practice.setWakeLockEnabled}
            wakeLockEnabled={practice.wakeLockEnabled}
            wakeLockStatus={practice.wakeLockStatus}
          />
          <GuidedPracticeDisplay
            configuration={practice.guidedPractice}
            timeSignature={practice.pattern.timeSignature}
          />
          <BeatVisualizer
            countInMeasures={practice.countInMeasures}
            pattern={practice.pattern}
            status={practice.status}
          />

          <TransportPanel
            onPause={practice.pause}
            onPlay={() => void practice.play()}
            onStop={practice.stop}
            status={practice.status}
          />

          <PracticeNotices
            countInMeasures={practice.countInMeasures}
            errorMessage={practice.errorMessage}
            onDismiss={practice.dismissOnboarding}
            showOnboarding={practice.showOnboarding}
          />
        </section>

        <PracticeSettings
          bpm={practice.bpm}
          countInMeasures={practice.countInMeasures}
          defaultBpm={practice.pattern.defaultBpm}
          fillFrequency={practice.fillFrequency}
          humanization={practice.humanization}
          onBpmChange={practice.changeBpm}
          onCountInChange={practice.setCountInMeasures}
          onFillFrequencyChange={practice.changeFillFrequency}
          onHumanizationChange={practice.changeHumanization}
          onSwingChange={practice.changeSwing}
          onTapTempo={practice.tapTempo}
          practiceMode={practice.guidedPractice.mode}
          status={practice.status}
          swing={practice.swing}
          timeSignature={practice.pattern.timeSignature}
        />
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {audioStatusCopy[practice.status]}
      </p>
      <p aria-live="polite" className="sr-only" role="status">
        {practice.patternAnnouncement}
      </p>
      <ShortcutsDialog
        onClose={() => practice.setShortcutsOpen(false)}
        open={practice.shortcutsOpen}
      />
    </main>
  );
}
