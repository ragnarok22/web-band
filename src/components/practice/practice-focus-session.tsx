import { FocusMode } from "@/components/practice/focus-mode";
import { ShortcutsDialog } from "@/components/practice/shortcuts-dialog";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type { GuidedPracticeConfiguration } from "@/types/practice";
import type {
  BeatFlashIntensity,
  BpmAdjustmentStep,
  VisualSubdivisionDetail,
} from "@/types/persistence";

interface PracticeFocusSessionProps {
  bpm: number;
  beatFlashIntensity: BeatFlashIntensity;
  bpmAdjustmentStep: BpmAdjustmentStep;
  configuration: GuidedPracticeConfiguration;
  countInMeasures: CountInMeasures;
  elapsedSeconds: number;
  errorMessage: string | null;
  historyNotice: string | null;
  isFinishing: boolean;
  isReady: boolean;
  onDismissNotice: () => void;
  onExit: () => void;
  onFinish: () => void;
  onPlay: () => void;
  onShortcutsClose: () => void;
  onStop: () => void;
  pattern: DrumPattern;
  showOnboarding: boolean;
  shortcutsOpen: boolean;
  status: AudioEngineStatus;
  visualSubdivisionDetail: VisualSubdivisionDetail;
}

export function PracticeFocusSession({
  bpm,
  beatFlashIntensity,
  bpmAdjustmentStep,
  configuration,
  countInMeasures,
  elapsedSeconds,
  errorMessage,
  historyNotice,
  isFinishing,
  isReady,
  onDismissNotice,
  onExit,
  onFinish,
  onPlay,
  onShortcutsClose,
  onStop,
  pattern,
  showOnboarding,
  shortcutsOpen,
  status,
  visualSubdivisionDetail,
}: PracticeFocusSessionProps) {
  return (
    <>
      <FocusMode
        bpm={bpm}
        beatFlashIntensity={beatFlashIntensity}
        configuration={configuration}
        countInMeasures={countInMeasures}
        elapsedSeconds={elapsedSeconds}
        errorMessage={errorMessage}
        historyNotice={historyNotice}
        isFinishing={isFinishing}
        isReady={isReady}
        onDismissNotice={onDismissNotice}
        onExit={onExit}
        onFinish={onFinish}
        onPlay={onPlay}
        onStop={onStop}
        pattern={pattern}
        showOnboarding={showOnboarding}
        status={status}
        visualSubdivisionDetail={visualSubdivisionDetail}
      />
      <ShortcutsDialog
        adjustmentStep={bpmAdjustmentStep}
        onClose={onShortcutsClose}
        open={shortcutsOpen}
      />
    </>
  );
}
