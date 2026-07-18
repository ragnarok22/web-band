"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { usePracticeModal } from "@/hooks/use-practice-modal";

interface ShortcutsDialogProps {
  onClose: () => void;
  open: boolean;
}

const shortcuts = [
  ["Space", "Start when idle, stop when active"],
  ["Escape", "Stop playback"],
  ["↑ / ↓", "Change tempo by 1 BPM"],
  ["Shift + ↑ / ↓", "Change tempo by 5 BPM"],
  ["T", "Tap tempo"],
  ["F", "Toggle focus mode"],
  ["M", "Mute or unmute master"],
] as const;

export function ShortcutsDialog({ onClose, open }: ShortcutsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  usePracticeModal(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby="shortcuts-heading"
      className="border-border bg-surface text-foreground fixed inset-0 m-auto w-[min(92vw,32rem)] rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop:bg-black/70"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
            Hands off the mouse
          </p>
          <h2 className="mt-1 text-2xl font-black" id="shortcuts-heading">
            Keyboard shortcuts
          </h2>
        </div>
        <button
          aria-label="Close keyboard shortcuts"
          className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 items-center justify-center rounded-lg"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <dl className="grid gap-1 p-5 pt-2">
        {shortcuts.map(([key, description]) => (
          <div
            className="bg-surface-elevated grid grid-cols-[8rem_1fr] items-center gap-3 rounded-lg px-3 py-2.5"
            key={key}
          >
            <dt>
              <kbd className="border-border bg-background rounded-md border px-2 py-1 text-xs font-black">
                {key}
              </kbd>
            </dt>
            <dd className="text-muted-strong text-sm">{description}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  );
}
