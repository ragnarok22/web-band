"use client";

import { X } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { BpmAdjustmentStep } from "@/hooks/use-practice-shortcuts";

interface ShortcutsDialogProps {
  adjustmentStep?: BpmAdjustmentStep;
  onClose: () => void;
  open: boolean;
}

export function ShortcutsDialog({
  adjustmentStep = 1,
  onClose,
  open,
}: ShortcutsDialogProps) {
  const alternateStep = adjustmentStep === 1 ? 5 : 1;
  const shortcuts = [
    ["Space", "Play or pause"],
    ["Escape", "Stop playback"],
    ["↑ / ↓", `Change tempo by ${adjustmentStep} BPM`],
    ["Shift + ↑ / ↓", `Change tempo by ${alternateStep} BPM`],
    ["← / →", "Change pattern"],
    ["T", "Tap tempo"],
    ["F", "Toggle focus mode"],
    ["M", "Mute or unmute master"],
  ] as const;

  return (
    <Modal
      aria-labelledby="shortcuts-heading"
      className="gap-0 p-0 sm:max-w-lg"
      open={open}
      onClose={onClose}
    >
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <p className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
            Hands off the mouse
          </p>
          <h2 className="mt-1 text-2xl font-black" id="shortcuts-heading">
            Keyboard shortcuts
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close keyboard shortcuts"
          className="size-11"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <dl className="grid gap-1 p-5 pt-2">
        {shortcuts.map(([key, description]) => (
          <div
            className="bg-surface-elevated grid grid-cols-[8rem_1fr] items-center gap-3 rounded-lg px-3 py-2.5"
            key={key}
          >
            <dt>
              <Kbd>{key}</Kbd>
            </dt>
            <dd className="text-muted-strong text-sm">{description}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
