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
import { useAppearanceStore } from "@/stores/appearance-store";
import type { AudioEngineStatus } from "@/types/audio";

export function PracticeScreen() {
  const practice = usePracticeController();
  const beatFlashIntensity = useAppearanceStore(
    (state) => state.beatFlashIntensity,
  );
  const visualSubdivisionDetail = useAppearanceStore(
    (state) => state.visualSubdivisionDetail,
  );

  const content = practice.isFocusMode ? (
    <PracticeFocusSession
      bpm={practice.bpm}
      beatFlashIntensity={beatFlashIntensity}
      bpmAdjustmentStep={practice.bpmAdjustmentStep}
      configuration={practice.guidedPractice}
      countInMeasures={practice.countInMeasures}
      elapsedSeconds={practice.elapsedSeconds}
      errorMessage={practice.errorMessage}
      historyNotice={practice.historyNotice}
      isReady={practice.isReady}
      isFinishing={practice.isFinishing}
      onDismissNotice={practice.dismissOnboarding}
      onExit={practice.exitFocusMode}
      onFinish={practice.finishWithFill}
      onPlay={() => void practice.play()}
      onShortcutsClose={() => practice.setShortcutsOpen(false)}
      onStop={practice.stop}
      pattern={practice.pattern}
      showOnboarding={practice.showOnboarding}
      shortcutsOpen={practice.shortcutsOpen}
      status={practice.status}
      visualSubdivisionDetail={visualSubdivisionDetail}
      wakeLockStatus={practice.wakeLockStatus}
    />
  ) : (
    <main className="mx-auto flex min-h-screen w-full max-w-[92rem] flex-col px-3 pb-8 sm:px-6 lg:px-8">
      <PracticeHeader status={practice.status} />
      <div className="pt-4 lg:pt-6">
        <PracticePresetBar
          configuration={practice.presetConfiguration}
          loadedPresetName={practice.loadedPresetName}
          onLoad={practice.loadPreset}
        />
      </div>

      <div className="grid flex-1 gap-4 pt-4 md:grid-cols-2 md:items-start md:gap-5 xl:grid-cols-[minmax(16rem,0.78fr)_minmax(25rem,1.5fr)_minmax(16rem,0.78fr)]">
        <aside
          aria-label="Pattern and mixer"
          className="order-2 grid gap-4 sm:grid-cols-2 md:grid-cols-1 xl:order-1"
        >
          <PatternSummary
            immediatePatternSwitch={practice.immediatePatternSwitch}
            onPatternChange={practice.changePattern}
            onImmediatePatternSwitchChange={practice.setImmediatePatternSwitch}
            pattern={practice.pattern}
            patterns={practice.patterns}
            pendingPatternId={practice.pendingPatternId}
            swing={practice.swing}
          />

          <CompactMixer
            disabled={!practice.isReady}
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

        <section
          aria-label="Practice session"
          className="order-1 col-span-full flex flex-col gap-5 xl:order-2 xl:col-span-1"
        >
          <SessionToolbar
            elapsedSeconds={practice.elapsedSeconds}
            focusButtonRef={practice.focusButtonRef}
            onFocus={() => practice.setFocusMode(true)}
            onShortcuts={() => practice.setShortcutsOpen(true)}
            onWakeLockChange={practice.setWakeLockEnabled}
            wakeLockEnabled={practice.wakeLockEnabled}
            wakeLockDisabled={!practice.isReady}
            wakeLockStatus={practice.wakeLockStatus}
          />
          <GuidedPracticeDisplay
            configuration={practice.guidedPractice}
            timeSignature={practice.pattern.timeSignature}
          />
          <BeatVisualizer
            countInMeasures={practice.countInMeasures}
            detail={visualSubdivisionDetail}
            intensity={beatFlashIntensity}
            pattern={practice.pattern}
            status={practice.status}
          />

          <TransportPanel
            isReady={practice.isReady}
            isFinishing={practice.isFinishing}
            onFinish={practice.finishWithFill}
            onPause={practice.pause}
            onPlay={() => void practice.play()}
            onStop={practice.stop}
            status={practice.status}
          />

          <PracticeNotices
            countInMeasures={practice.countInMeasures}
            errorMessage={practice.errorMessage}
            noticeMessage={practice.historyNotice}
            onDismiss={practice.dismissOnboarding}
            showOnboarding={practice.showOnboarding}
          />
        </section>

        <PracticeSettings
          adjustmentStep={practice.bpmAdjustmentStep}
          bpm={practice.bpm}
          countInMeasures={practice.countInMeasures}
          defaultBpm={practice.pattern.defaultBpm}
          disabled={!practice.isReady}
          fillFrequency={practice.fillFrequency}
          humanization={practice.humanization}
          onBpmChange={practice.changeBpm}
          onBpmCommit={practice.announceBpm}
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

      <ShortcutsDialog
        adjustmentStep={practice.bpmAdjustmentStep}
        onClose={() => practice.setShortcutsOpen(false)}
        open={practice.shortcutsOpen}
      />
    </main>
  );

  return (
    <>
      {content}
      <PracticeLiveRegions
        announcement={practice.practiceAnnouncement}
        status={practice.status}
      />
    </>
  );
}

function PracticeLiveRegions({
  announcement,
  status,
}: {
  announcement: string;
  status: AudioEngineStatus;
}) {
  return (
    <div className="sr-only">
      <p
        aria-atomic="true"
        aria-live="polite"
        data-testid="playback-live-region"
        role="status"
      >
        {audioStatusCopy[status]}
      </p>
      <p
        aria-atomic="true"
        aria-live="polite"
        data-testid="practice-live-region"
        role="status"
      >
        {announcement}
      </p>
    </div>
  );
}
