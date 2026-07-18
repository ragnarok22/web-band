import { FocusMode } from "@/components/practice/focus-mode";
import { ShortcutsDialog } from "@/components/practice/shortcuts-dialog";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type { GuidedPracticeConfiguration } from "@/types/practice";

interface PracticeFocusSessionProps {
  bpm: number;
  configuration: GuidedPracticeConfiguration;
  countInMeasures: CountInMeasures;
  elapsedSeconds: number;
  errorMessage: string | null;
  onDismissNotice: () => void;
  onExit: () => void;
  onPlay: () => void;
  onShortcutsClose: () => void;
  onStop: () => void;
  pattern: DrumPattern;
  showOnboarding: boolean;
  shortcutsOpen: boolean;
  status: AudioEngineStatus;
}

export function PracticeFocusSession({
  bpm,
  configuration,
  countInMeasures,
  elapsedSeconds,
  errorMessage,
  onDismissNotice,
  onExit,
  onPlay,
  onShortcutsClose,
  onStop,
  pattern,
  showOnboarding,
  shortcutsOpen,
  status,
}: PracticeFocusSessionProps) {
  return (
    <>
      <FocusMode
        bpm={bpm}
        configuration={configuration}
        countInMeasures={countInMeasures}
        elapsedSeconds={elapsedSeconds}
        errorMessage={errorMessage}
        onDismissNotice={onDismissNotice}
        onExit={onExit}
        onPlay={onPlay}
        onStop={onStop}
        pattern={pattern}
        showOnboarding={showOnboarding}
        status={status}
      />
      <ShortcutsDialog onClose={onShortcutsClose} open={shortcutsOpen} />
    </>
  );
}
