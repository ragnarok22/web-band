"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationDialogProps {
  confirmLabel: string;
  description: string;
  destructive?: boolean;
  heading: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmationDialog({
  confirmLabel,
  description,
  destructive = false,
  heading,
  onClose,
  onConfirm,
}: ConfirmationDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function confirm(): Promise<void> {
    setIsWorking(true);
    setErrorMessage(null);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "The action could not be completed.",
      );
      setIsWorking(false);
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open, details) => {
        if (!open) {
          if (isWorking) details.cancel();
          else onClose();
        }
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <div className="p-5 sm:p-6">
          <p className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
            Please confirm
          </p>
          <AlertDialogTitle
            className="mt-2 text-2xl font-black [overflow-wrap:anywhere] break-words"
            id="confirmation-heading"
          >
            {heading}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground mt-3 leading-6 [overflow-wrap:anywhere] break-words">
            {description}
          </AlertDialogDescription>
          {errorMessage ? (
            <p
              className="border-danger/30 bg-danger/10 mt-4 rounded-xl border p-3 text-sm"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              autoFocus
              variant="outline"
              className="min-h-11"
              disabled={isWorking}
              onClick={onClose}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              className="min-h-11"
              disabled={isWorking}
              onClick={() => void confirm()}
              type="button"
            >
              {isWorking ? "Working…" : confirmLabel}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
