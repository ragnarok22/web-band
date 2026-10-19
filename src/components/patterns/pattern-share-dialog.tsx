"use client";

import { useId } from "react";

import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";

import type { PatternSharePreview } from "@/types/pattern-sharing";

interface PatternShareDialogProps {
  collisionCount: number;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onImport: () => Promise<void>;
  preview: PatternSharePreview;
}

export function PatternShareDialog({
  collisionCount,
  errorMessage,
  isPending,
  onClose,
  onImport,
  preview,
}: PatternShareDialogProps) {
  const headingId = useId();

  return (
    <Modal
      aria-labelledby={headingId}
      className="p-0 sm:max-w-xl"
      busy={isPending}
      onClose={onClose}
    >
      <div className="p-5 sm:p-7">
        <p className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
          Shared groove file
        </p>
        <h2 className="mt-2 text-2xl font-black" id={headingId}>
          Import{" "}
          {preview.patternCount === 1 ? "this pattern" : "these patterns"}?
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {preview.fileName
            ? `${preview.fileName} contains `
            : "This file contains "}
          {preview.patternCount} custom{" "}
          {preview.patternCount === 1 ? "pattern" : "patterns"}. Existing
          patterns are never overwritten.
        </p>

        <ul className="border-border bg-background/45 mt-5 max-h-56 space-y-1 overflow-y-auto rounded-2xl border p-3">
          {preview.envelope.data.patterns.map((pattern) => (
            <li
              className="text-muted-strong flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm"
              key={pattern.id}
            >
              <span className="min-w-0 truncate font-extrabold">
                {pattern.name}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {pattern.timeSignature.numerator}/
                {pattern.timeSignature.denominator} · {pattern.hits.length} hits
              </span>
            </li>
          ))}
        </ul>

        {collisionCount > 0 ? (
          <p className="border-secondary-accent/35 bg-secondary-accent/10 mt-4 rounded-xl border p-3 text-sm leading-5">
            {collisionCount}{" "}
            {collisionCount === 1 ? "pattern has" : "patterns have"} an ID
            already on this device. {collisionCount === 1 ? "It" : "They"} will
            be added as a separate copy.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-danger mt-4 text-sm leading-5" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            autoFocus
            className="border-border text-muted-strong min-h-11 rounded-xl border px-4 text-sm font-extrabold"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Cancel
          </Button>
          <Button
            className="min-h-11"
            disabled={isPending}
            onClick={() => void onImport()}
            type="button"
          >
            {isPending ? "Importing…" : "Add to library"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
