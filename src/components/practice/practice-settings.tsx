import { LibraryBig } from "lucide-react";
import Link from "next/link";

import { BpmControls } from "@/components/practice/bpm-controls";
import { CountInControl } from "@/components/practice/count-in-control";
import { GrooveControls } from "@/components/practice/groove-controls";
import { GuidedPracticePanel } from "@/components/practice/guided-practice-panel";
import type { BpmAdjustmentStep } from "@/hooks/use-practice-shortcuts";
import { isSessionActive } from "@/lib/audio-status";
import type {
  AudioEngineStatus,
  CountInMeasures,
  FillFrequency,
} from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";
import type { PracticeMode } from "@/types/practice";

interface PracticeSettingsProps {
  adjustmentStep?: BpmAdjustmentStep;
  bpm: number;
  countInMeasures: CountInMeasures;
  defaultBpm: number;
  fillFrequency: FillFrequency;
  humanization: number;
  onBpmChange: (bpm: number) => void;
  onCountInChange: (measures: CountInMeasures) => void;
  onFillFrequencyChange: (frequency: FillFrequency) => void;
  onHumanizationChange: (amount: number) => void;
  onSwingChange: (amount: number) => void;
  onTapTempo: () => void;
  practiceMode: PracticeMode;
  status: AudioEngineStatus;
  swing: number;
  timeSignature: TimeSignature;
}

export function PracticeSettings({
  adjustmentStep = 1,
  bpm,
  countInMeasures,
  defaultBpm,
  fillFrequency,
  humanization,
  onBpmChange,
  onCountInChange,
  onFillFrequencyChange,
  onHumanizationChange,
  onSwingChange,
  onTapTempo,
  practiceMode,
  status,
  swing,
  timeSignature,
}: PracticeSettingsProps) {
  return (
    <aside
      aria-label="Practice settings"
      className="order-3 grid gap-4 sm:grid-cols-2 md:grid-cols-1"
    >
      <GuidedPracticePanel
        activeTimeSignature={timeSignature}
        sessionDisabled={isSessionActive(status)}
      />

      {practiceMode === "tempoTrainer" ? null : (
        <BpmControls
          adjustmentStep={adjustmentStep}
          bpm={bpm}
          defaultBpm={defaultBpm}
          onChange={onBpmChange}
          onTap={onTapTempo}
        />
      )}

      <CountInControl
        disabled={isSessionActive(status)}
        measures={countInMeasures}
        onChange={onCountInChange}
        timeSignature={timeSignature}
      />

      <GrooveControls
        fillFrequency={fillFrequency}
        humanization={humanization}
        onFillFrequencyChange={onFillFrequencyChange}
        onHumanizationChange={onHumanizationChange}
        onSwingChange={onSwingChange}
        swing={swing}
      />

      <Link
        className="border-border bg-surface text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-colors sm:col-span-2 md:col-span-1"
        href="/patterns"
      >
        <LibraryBig aria-hidden="true" className="size-4" />
        Browse all patterns
      </Link>
    </aside>
  );
}
