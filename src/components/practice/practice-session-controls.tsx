import { Hand } from "lucide-react";

import { BpmControls } from "@/components/practice/bpm-controls";
import { CountInControl } from "@/components/practice/count-in-control";
import { SessionToolbar } from "@/components/practice/session-toolbar";
import { TransportPanel } from "@/components/practice/transport-panel";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { usePracticeController } from "@/hooks/use-practice-controller";

export function PracticeSessionControls({
  practice,
}: {
  practice: ReturnType<typeof usePracticeController>;
}) {
  const tempoTrainer = practice.guidedPractice.mode === "tempoTrainer";
  return (
    <TransportPanel
      isReady={practice.isReady}
      isFinishing={practice.isFinishing}
      onFinish={practice.finishWithFill}
      onPause={practice.pause}
      onPlay={() => void practice.play()}
      onStop={practice.stop}
      status={practice.status}
      footer={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              className="text-primary min-h-11 gap-2 px-1"
              disabled={!practice.isReady || (tempoTrainer && practice.active)}
              onClick={practice.tapTempo}
            >
              <Hand aria-hidden="true" className="size-4" />
              Tap tempo{" "}
              <Kbd className="hidden @lg/transport:inline-flex">T</Kbd>
            </Button>
            <CountInControl
              compact
              disabled={!practice.isReady || practice.active}
              measures={practice.countInMeasures}
              onChange={practice.setCountInMeasures}
              timeSignature={practice.pattern.timeSignature}
            />
          </div>
          <SessionToolbar
            elapsedSeconds={practice.elapsedSeconds}
            focusButtonRef={practice.focusButtonRef}
            onFocus={() => practice.setFocusMode(true)}
            onShortcuts={() => practice.setShortcutsOpen(true)}
          />
        </>
      }
    >
      {tempoTrainer ? (
        <div className="text-muted-strong text-sm">
          <p className="text-foreground font-bold">
            Tempo Trainer controls your pace
          </p>
          <p className="mt-1 text-xs">
            Adjust your starting and target BPM in trainer setup.
          </p>
        </div>
      ) : (
        <BpmControls
          embedded
          showTapTempo={false}
          adjustmentStep={practice.bpmAdjustmentStep}
          bpm={practice.bpm}
          defaultBpm={practice.pattern.defaultBpm}
          disabled={!practice.isReady}
          onChange={practice.changeBpm}
          onCommit={practice.announceBpm}
          onTap={practice.tapTempo}
        />
      )}
    </TransportPanel>
  );
}
