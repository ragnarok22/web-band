import { CircleDot } from "lucide-react";
import type { ReactNode } from "react";

import { TransportControls } from "@/components/practice/transport-controls";
import { audioStatusCopy } from "@/lib/audio-status";
import type { AudioEngineStatus } from "@/types/audio";

interface TransportPanelProps {
  children?: ReactNode;
  footer?: ReactNode;
  isReady?: boolean;
  isFinishing?: boolean;
  onFinish: () => void;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  status: AudioEngineStatus;
}

export function TransportPanel({
  children,
  footer,
  isReady = true,
  isFinishing = false,
  onFinish,
  onPause,
  onPlay,
  onStop,
  status,
}: TransportPanelProps) {
  return (
    <div className="border-border @container/transport border-t px-4 py-4 sm:px-6">
      <div
        className="mx-auto grid max-w-4xl grid-cols-1 items-center justify-items-center gap-3 @3xl/transport:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        data-slot="transport-primary"
      >
        <div className="min-w-0 @3xl/transport:justify-self-start">
          {children}
        </div>
        <TransportControls
          isFinishing={isFinishing}
          onFinish={onFinish}
          onPause={onPause}
          onPlay={onPlay}
          onStop={onStop}
          playDisabled={!isReady}
          status={status}
        />
        <div className="text-muted-foreground flex min-h-6 min-w-0 items-center gap-1.5 text-xs font-semibold @3xl/transport:justify-self-end">
          <CircleDot
            aria-hidden="true"
            className={`${status === "playing" ? "text-success" : "text-primary"} size-3 shrink-0`}
          />
          <span data-testid="transport-status" title={audioStatusCopy[status]}>
            {isReady
              ? compactStatusCopy[status]
              : "Loading your saved practice setup…"}
          </span>
        </div>
      </div>
      <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t pt-3">
        {footer}
      </div>
    </div>
  );
}

const compactStatusCopy: Record<AudioEngineStatus, string> = {
  "not-initialized": "Ready",
  initializing: "Starting audio…",
  ready: "Ready",
  "counting-in": "Counting in",
  playing: "Playing",
  paused: "Paused",
  stopped: "Stopped",
  suspended: "Audio suspended — press Play to resume",
  error: "Audio unavailable",
};
