import { BpmControls } from "@/components/practice/bpm-controls";
import { CountInControl } from "@/components/practice/count-in-control";
import { SessionToolbar } from "@/components/practice/session-toolbar";
import { TransportPanel } from "@/components/practice/transport-panel";
import { Button } from "@/components/ui/button";
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
          <CountInControl
            compact
            disabled={!practice.isReady || practice.active}
            measures={practice.countInMeasures}
            onChange={practice.setCountInMeasures}
            timeSignature={practice.pattern.timeSignature}
          />
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
        <div className="text-muted-strong max-w-xs text-center text-sm leading-6">
          <p className="text-foreground font-bold">
            Tempo Trainer controls your pace
          </p>
          <p>Set the starting and target BPM above.</p>
          <Button
            variant="outline"
            className="mt-3 min-h-11 px-4"
            disabled={!practice.isReady || practice.active}
            onClick={practice.tapTempo}
          >
            Tap tempo
          </Button>
        </div>
      ) : (
        <BpmControls
          embedded
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
