"use client";

import type { ComponentProps } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePracticeModal } from "@/hooks/use-practice-modal";

// Feature dialogs share dismissal rules and suspend global practice shortcuts.
export function Modal({
  open = true,
  onClose,
  busy = false,
  ...props
}: ComponentProps<typeof DialogContent> & {
  open?: boolean;
  onClose: () => void;
  busy?: boolean;
}) {
  usePracticeModal(open);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) return;
        if (busy) details.cancel();
        else onClose();
      }}
    >
      <DialogContent showCloseButton={false} {...props} />
    </Dialog>
  );
}
