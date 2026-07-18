"use client";

import { useEffect, useRef, useState } from "react";

interface HistoryConfirmationDialogProps {
  confirmLabel: string;
  description: string;
  heading: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function HistoryConfirmationDialog({
  confirmLabel,
  description,
  heading,
  onClose,
  onConfirm,
}: HistoryConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function confirm(): Promise<void> {
    setIsWorking(true);
    setErrorMessage(null);
    try {
      await onConfirm();
      dialogRef.current?.close();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "The journal could not be updated.",
      );
      setIsWorking(false);
    }
  }

  return (
    <dialog
      aria-labelledby="history-confirmation-heading"
      className="border-border bg-surface text-foreground fixed inset-0 m-auto w-[min(92vw,28rem)] overscroll-contain rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        if (!isWorking) dialogRef.current?.close();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="p-5 sm:p-6">
        <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
          Journal edit
        </p>
        <h2
          className="mt-2 text-2xl font-black [overflow-wrap:anywhere] break-words"
          id="history-confirmation-heading"
        >
          {heading}
        </h2>
        <p className="text-muted mt-3 leading-6 [overflow-wrap:anywhere] break-words">
          {description}
        </p>
        {errorMessage ? (
          <p
            className="border-danger/30 bg-danger/10 mt-4 rounded-xl border p-3 text-sm"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            autoFocus
            className="border-border text-muted-strong min-h-11 rounded-xl border px-4 text-sm font-extrabold"
            disabled={isWorking}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            Cancel
          </button>
          <button
            className="bg-danger text-background min-h-11 rounded-xl px-5 text-sm font-extrabold"
            disabled={isWorking}
            onClick={() => void confirm()}
            type="button"
          >
            {isWorking ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
