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
    <div className="border-border bg-surface @container/transport rounded-2xl border px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid items-center justify-items-center gap-6">
        {children}
        <div>
          <TransportControls
            isFinishing={isFinishing}
            onFinish={onFinish}
            onPause={onPause}
            onPlay={onPlay}
            onStop={onStop}
            playDisabled={!isReady}
            status={status}
          />
          <div className="text-muted-strong mt-5 flex min-h-5 items-center justify-center gap-2 text-center text-sm font-semibold">
            <CircleDot aria-hidden="true" className="text-primary size-3" />
            <span data-testid="transport-status">
              {isReady
                ? audioStatusCopy[status]
                : "Loading your saved practice setup…"}
            </span>
          </div>
        </div>
      </div>
      {footer ? (
        <div className="border-border mt-5 flex flex-wrap items-end justify-center gap-4 border-t pt-5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
