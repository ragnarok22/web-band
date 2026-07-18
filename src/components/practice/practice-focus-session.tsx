import { FocusMode } from "@/components/practice/focus-mode";
import { ShortcutsDialog } from "@/components/practice/shortcuts-dialog";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";

interface PracticeFocusSessionProps {
  bpm: number;
  countInMeasures: CountInMeasures;
  elapsedSeconds: number;
  onExit: () => void;
  onPlay: () => void;
  onShortcutsClose: () => void;
  onStop: () => void;
  pattern: DrumPattern;
  shortcutsOpen: boolean;
  status: AudioEngineStatus;
}

export function PracticeFocusSession({
  bpm,
  countInMeasures,
  elapsedSeconds,
  onExit,
  onPlay,
  onShortcutsClose,
  onStop,
  pattern,
  shortcutsOpen,
  status,
}: PracticeFocusSessionProps) {
  return (
    <>
      <FocusMode
        bpm={bpm}
        countInMeasures={countInMeasures}
        elapsedSeconds={elapsedSeconds}
        onExit={onExit}
        onPlay={onPlay}
        onStop={onStop}
        pattern={pattern}
        status={status}
      />
      <ShortcutsDialog onClose={onShortcutsClose} open={shortcutsOpen} />
    </>
  );
}
