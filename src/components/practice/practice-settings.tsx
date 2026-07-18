import { LibraryBig } from "lucide-react";
import Link from "next/link";

import { BpmControls } from "@/components/practice/bpm-controls";
import { CountInControl } from "@/components/practice/count-in-control";
import { GrooveControls } from "@/components/practice/groove-controls";
import { isSessionActive } from "@/lib/audio-status";
import type {
  AudioEngineStatus,
  CountInMeasures,
  FillFrequency,
} from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";

interface PracticeSettingsProps {
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
  status: AudioEngineStatus;
  swing: number;
  timeSignature: TimeSignature;
}

export function PracticeSettings({
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
  status,
  swing,
  timeSignature,
}: PracticeSettingsProps) {
  return (
    <aside className="order-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      <BpmControls
        bpm={bpm}
        defaultBpm={defaultBpm}
        onChange={onBpmChange}
        onTap={onTapTempo}
      />

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
        className="border-border bg-surface text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-colors sm:col-span-2 lg:col-span-1"
        href="/patterns"
      >
        <LibraryBig aria-hidden="true" className="size-4" />
        Browse all patterns
      </Link>
    </aside>
  );
}
