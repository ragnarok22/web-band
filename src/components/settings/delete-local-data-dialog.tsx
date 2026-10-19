"use client";

import { useId, useState } from "react";

import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  const headingId = useId();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Modal
      aria-labelledby={headingId}
      className="p-0 sm:max-w-lg"
      busy={isPending}
      onClose={onClose}
    >
      <div className="p-5 sm:p-7">
        <p className="text-danger text-xs font-extrabold tracking-[0.16em] uppercase">
          Device data
        </p>
        <h2 className="mt-2 text-2xl font-black" id={headingId}>
          Delete all local data?
        </h2>
        <p className="text-muted-foreground mt-3 leading-6">
          A safety backup download is started before deletion. Then custom
          patterns, favorites, presets, sessions, app settings, appearance,
          recents, onboarding state, and legacy Web Band preferences are removed
          from this device.
        </p>
        <label className="border-danger/30 bg-danger/8 mt-5 flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold">
          <Checkbox
            checked={confirmed}
            disabled={isPending}
            onCheckedChange={setConfirmed}
          />
          I understand this removes all Web Band data from this device
        </label>
        {errorMessage ? (
          <p className="text-danger mt-4 text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            autoFocus
            variant="outline"
            className="min-h-11"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="min-h-11"
            disabled={isPending || !confirmed}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isPending ? "Deleting…" : "Delete local data"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
