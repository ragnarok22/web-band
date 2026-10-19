import type { ReactNode } from "react";

import { TransportControls } from "@/components/practice/transport-controls";
import type { AudioEngineStatus } from "@/types/audio";

interface TransportPanelProps {
  children?: ReactNode;
  footer?: ReactNode;
  isReady?: boolean;
  isFinishing?: boolean;
  finishWithFill?: boolean;
  onFinish: () => void;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  status: AudioEngineStatus;
  statusIndicator: ReactNode;
}

export function TransportPanel({
  children,
  footer,
  isReady = true,
  isFinishing = false,
  finishWithFill = true,
  onFinish,
  onPause,
  onPlay,
  onStop,
  status,
  statusIndicator,
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
          finishWithFill={finishWithFill}
          isFinishing={isFinishing}
          onFinish={onFinish}
          onPause={onPause}
          onPlay={onPlay}
          onStop={onStop}
          playDisabled={!isReady}
          status={status}
        />
        <div className="min-w-0 @3xl/transport:justify-self-end">
          {statusIndicator}
        </div>
      </div>
      <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t pt-3">
        {footer}
      </div>
    </div>
  );
}
