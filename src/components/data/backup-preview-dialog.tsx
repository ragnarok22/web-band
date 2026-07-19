"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { BackupPreview } from "@/lib/backup-envelope";
import type { ImportMode } from "@/types/persistence";

const countLabels = {
  customChordProgressions: "Chord progressions",
  customPatterns: "Custom patterns",
  customStrummingPatterns: "Strumming patterns",
  favoriteChordProgressionIds: "Favorite chord progressions",
  favoritePatternIds: "Favorite patterns",
  practicePresets: "Practice presets",
  practiceSessions: "Practice sessions",
} as const;

const backupTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

interface BackupPreviewDialogProps {
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onImport: (mode: ImportMode) => Promise<void>;
  preview: BackupPreview;
}

export function BackupPreviewDialog({
  errorMessage,
  isPending,
  onClose,
  onImport,
  preview,
}: BackupPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [mode, setMode] = useState<ImportMode>("merge");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      aria-labelledby={headingId}
      className="border-border bg-surface text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,34rem)] overflow-y-auto rounded-3xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) dialogRef.current?.close();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="p-5 sm:p-7">
        <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
          Import preview
        </p>
        <h2 className="mt-2 text-2xl font-black" id={headingId}>
          Review backup
        </h2>
        <p className="text-muted mt-3 text-sm leading-6">
          Created{" "}
          <time dateTime={preview.exportedAt}>
            {backupTimestampFormatter.format(new Date(preview.exportedAt))} UTC
          </time>
          {preview.fileName ? ` from ${preview.fileName}` : ""}.
        </p>

        <dl className="border-border bg-background/45 mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-3">
          {Object.entries(countLabels).map(([key, label]) => (
            <div className="bg-surface-elevated/45 p-3" key={key}>
              <dt className="text-muted text-xs leading-4">{label}</dt>
              <dd className="mt-1 font-mono text-lg font-bold tabular-nums">
                {preview.counts[key as keyof typeof preview.counts]}
              </dd>
            </div>
          ))}
        </dl>
        <p className="border-border bg-background/45 text-muted mt-3 rounded-xl border px-3 py-2 text-xs leading-5">
          This backup also includes practice settings, appearance, recent
          patterns, and onboarding state. Imported settings and preferences
          replace the current values in both modes.
        </p>

        <fieldset className="mt-6">
          <legend className="text-sm font-extrabold">Import behavior</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="border-border has-checked:border-accent has-checked:bg-accent/8 flex min-h-14 items-start gap-3 rounded-xl border p-3">
              <input
                checked={mode === "merge"}
                className="mt-1 size-5 accent-[var(--accent)]"
                disabled={isPending}
                name="import-mode"
                onChange={() => {
                  setMode("merge");
                  setReplaceConfirmed(false);
                }}
                type="radio"
              />
              <span>
                <strong className="block text-sm">
                  Merge with current data
                </strong>
                <span className="text-muted mt-1 block text-xs leading-4">
                  Matching IDs use the imported version.
                </span>
              </span>
            </label>
            <label className="border-border has-checked:border-danger has-checked:bg-danger/8 flex min-h-14 items-start gap-3 rounded-xl border p-3">
              <input
                checked={mode === "replace"}
                className="mt-1 size-5 accent-[var(--danger)]"
                disabled={isPending}
                name="import-mode"
                onChange={() => setMode("replace")}
                type="radio"
              />
              <span>
                <strong className="block text-sm">Replace current data</strong>
                <span className="text-muted mt-1 block text-xs leading-4">
                  A safety backup download is started before replacement.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {mode === "replace" ? (
          <label className="border-danger/30 bg-danger/8 mt-4 flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold">
            <input
              checked={replaceConfirmed}
              className="size-5 accent-[var(--danger)]"
              disabled={isPending}
              onChange={(event) => setReplaceConfirmed(event.target.checked)}
              type="checkbox"
            />
            I understand current data will be replaced
          </label>
        ) : null}

        {errorMessage ? (
          <p className="text-danger mt-4 text-sm leading-5" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            autoFocus
            className="border-border text-muted-strong min-h-11 rounded-xl border px-4 text-sm font-extrabold"
            disabled={isPending}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            Cancel
          </button>
          <button
            className="bg-accent text-accent-ink min-h-11 rounded-xl px-5 text-sm font-extrabold disabled:opacity-45"
            disabled={isPending || (mode === "replace" && !replaceConfirmed)}
            onClick={() => void onImport(mode)}
            type="button"
          >
            {isPending ? "Importing…" : "Import data"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
