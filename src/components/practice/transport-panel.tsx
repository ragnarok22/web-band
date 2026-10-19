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
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 @2xl/transport:justify-between">
        {children}
        <TransportControls
          isFinishing={isFinishing}
          onFinish={onFinish}
          onPause={onPause}
          onPlay={onPlay}
          onStop={onStop}
          playDisabled={!isReady}
          status={status}
        />
      </div>
      <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t pt-3">
        {footer}
        <div className="text-muted-foreground flex min-h-6 items-center gap-1.5 text-xs font-semibold">
          <CircleDot
            aria-hidden="true"
            className={`${status === "playing" ? "text-success" : "text-primary"} size-3`}
          />
          <span data-testid="transport-status" title={audioStatusCopy[status]}>
            {isReady
              ? compactStatusCopy[status]
              : "Loading your saved practice setup…"}
          </span>
        </div>
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
