"use client";

import { useEffect, useId, useRef, useState } from "react";

interface DeleteLocalDataDialogProps {
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteLocalDataDialog({
  errorMessage,
  isPending,
  onClose,
  onConfirm,
}: DeleteLocalDataDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      aria-labelledby={headingId}
      className="border-danger/35 bg-surface text-foreground fixed inset-0 m-auto w-[min(92vw,30rem)] rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) dialogRef.current?.close();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="p-5 sm:p-7">
        <p className="text-danger text-xs font-extrabold tracking-[0.16em] uppercase">
          Device data
        </p>
        <h2 className="mt-2 text-2xl font-black" id={headingId}>
          Delete all local data?
        </h2>
        <p className="text-muted mt-3 leading-6">
          A safety backup downloads first. Then custom patterns, favorites,
          presets, sessions, and app settings are reset on this device.
        </p>
        <label className="border-danger/30 bg-danger/8 mt-5 flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold">
          <input
            checked={confirmed}
            className="size-5 accent-[var(--danger)]"
            disabled={isPending}
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
          />
          I understand this removes all Web Band data from this device
        </label>
        {errorMessage ? (
          <p className="text-danger mt-4 text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            autoFocus
            className="border-border min-h-11 rounded-xl border px-4 text-sm font-extrabold"
            disabled={isPending}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            Cancel
          </button>
          <button
            className="bg-danger text-background min-h-11 rounded-xl px-5 text-sm font-extrabold disabled:opacity-45"
            disabled={isPending || !confirmed}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isPending ? "Deleting..." : "Delete local data"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
