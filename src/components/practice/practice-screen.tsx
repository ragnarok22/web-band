"use client";

import { GuidedPracticePanel } from "@/components/practice/guided-practice-panel";
import { PracticePlayer } from "@/components/practice/practice-player";
import { PracticeModeSelector } from "@/components/practice/practice-mode-selector";
import {
  PracticeControlsPanel,
  PracticeControlsTrigger,
  usePracticeControlsPanel,
} from "@/components/practice/practice-controls-panel";
import { WakeLockStatusMessage } from "@/components/practice/wake-lock-status";
import { PatternSummary } from "@/components/practice/pattern-summary";
import { PracticeFocusSession } from "@/components/practice/practice-focus-session";
import { PracticeHeader } from "@/components/practice/practice-header";
import { PracticeNotices } from "@/components/practice/practice-notices";
import { PracticePresetBar } from "@/components/practice/practice-preset-bar";
import { PracticeSettings } from "@/components/practice/practice-settings";
import { ShortcutsDialog } from "@/components/practice/shortcuts-dialog";
import { usePracticeController } from "@/hooks/use-practice-controller";
import { audioStatusCopy } from "@/lib/audio-status";
import { useAppearanceStore } from "@/stores/appearance-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import type { AudioEngineStatus } from "@/types/audio";

export function PracticeScreen() {
  const practice = usePracticeController();
  const panel = usePracticeControlsPanel();
  const setMode = useGuidedPracticeStore((state) => state.setMode);
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
    <main className="mx-auto w-full max-w-[100rem] px-3 pb-8 sm:px-6 lg:px-8">
      <PracticeHeader
        actions={
          <>
            <PracticePresetBar
              configuration={practice.presetConfiguration}
              loadedPresetName={practice.loadedPresetName}
              onLoad={practice.loadPreset}
            />
            <PracticeControlsTrigger panel={panel} />
          </>
        }
      />
      <PracticeModeSelector
        disabled={!practice.isReady || practice.active}
        mode={practice.guidedPractice.mode}
        onChange={setMode}
      />

      <div
        className="practice-layout mt-5"
        data-controls-open={panel.desktop && panel.open}
      >
        <section
          aria-label="Practice session"
          className="flex min-w-0 flex-col gap-4"
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

          <PracticePlayer
            practice={practice}
            beatFlashIntensity={beatFlashIntensity}
            visualSubdivisionDetail={visualSubdivisionDetail}
          />
          <WakeLockStatusMessage status={practice.wakeLockStatus} />

          <PracticeNotices
            countInMeasures={practice.countInMeasures}
            errorMessage={
              practice.status === "error" ? null : practice.errorMessage
            }
            noticeMessage={practice.historyNotice}
            onDismiss={practice.dismissOnboarding}
            showOnboarding={false}
          />
          <GuidedPracticePanel
            activeTimeSignature={practice.pattern.timeSignature}
            sessionDisabled={!practice.isReady || practice.active}
          />
        </section>

        <PracticeControlsPanel panel={panel}>
          <PracticeSettings practice={practice} />
        </PracticeControlsPanel>
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
