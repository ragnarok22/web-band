import { CircleDot } from "lucide-react";

import { TransportControls } from "@/components/practice/transport-controls";
import { audioStatusCopy } from "@/lib/audio-status";
import type { AudioEngineStatus } from "@/types/audio";

interface TransportPanelProps {
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  status: AudioEngineStatus;
}

export function TransportPanel({
  onPause,
  onPlay,
  onStop,
  status,
}: TransportPanelProps) {
  return (
    <div className="border-border rounded-2xl border bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-7 shadow-[0_24px_70px_var(--shadow)] backdrop-blur sm:px-6 sm:py-9">
      <TransportControls
        onPause={onPause}
        onPlay={onPlay}
        onStop={onStop}
        status={status}
      />
      <div className="text-muted-strong mt-5 flex min-h-5 items-center justify-center gap-2 text-center text-sm font-semibold">
        <CircleDot aria-hidden="true" className="text-accent size-3" />
        <span data-testid="transport-status">{audioStatusCopy[status]}</span>
      </div>
    </div>
  );
}
