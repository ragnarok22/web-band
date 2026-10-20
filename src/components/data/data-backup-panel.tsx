"use client";
import { Button } from "@/components/ui/button";

import { Download, FileUp, ShieldCheck } from "lucide-react";
import { useId, useRef, useState } from "react";

import { BackupPreviewDialog } from "@/components/data/backup-preview-dialog";
import { parseBackupFile } from "@/lib/backup-browser";
import type { BackupPreview } from "@/lib/backup-envelope";
import {
  backupService,
  type BackupImportCompletion,
} from "@/services/backup-service";
import type { BackupEnvelope, ImportMode } from "@/types/persistence";

export interface DataBackupActions {
  exportCurrentBackup: () => Promise<BackupEnvelope>;
  importBackup: (
    value: unknown,
    mode: ImportMode,
  ) => Promise<BackupImportCompletion>;
}

interface DataBackupPanelProps {
  actions?: DataBackupActions;
  compact?: boolean;
  variant?: "default" | "settings";
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const presentations = {
  default: {
    container: "border-border bg-surface/70 rounded-3xl border p-5 sm:p-7",
    heading: "mt-2 text-2xl font-black",
    title: "Backup and restore",
    description:
      "Download a portable JSON copy of patterns, presets, sessions, favorites, settings, appearance, recents, and onboarding state stored on this device.",
    descriptionClass: "text-muted-foreground mt-2 text-sm leading-6",
    actions: "mt-6 flex flex-col gap-2 sm:flex-row",
  },
  journal: {
    container:
      "border-border bg-surface/55 mt-10 rounded-2xl border p-5 sm:flex sm:items-center sm:justify-between sm:gap-6",
    heading: "mt-2 text-xl font-black",
    title: "Journal backup",
    description:
      "Keep a portable copy of this journal, practice setup, and app preferences.",
    descriptionClass: "text-muted-foreground mt-2 text-sm leading-6",
    actions: "mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0",
  },
  settings: {
    container:
      "border-border grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-x-6",
    heading: "text-sm font-bold",
    title: "Backup & restore",
    description:
      "Export a JSON copy of your Web Band data or restore a backup.",
    descriptionClass: "text-muted-foreground mt-1 text-sm leading-5",
    actions: "flex flex-wrap gap-2",
  },
};

export function DataBackupPanel({
  actions = backupService,
  compact = false,
  variant = "default",
}: DataBackupPanelProps) {
  const isSettings = variant === "settings";
  const presentation =
    presentations[isSettings ? "settings" : compact ? "journal" : "default"];
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const Heading = isSettings ? "h3" : "h2";

  async function exportData(): Promise<void> {
    setIsPending(true);
    setErrorMessage(null);
    try {
      await actions.exportCurrentBackup();
      setAnnouncement("Backup download started.");
    } catch (error) {
      setErrorMessage(
        messageFromError(error, "Your backup could not be created."),
      );
    } finally {
      setIsPending(false);
    }
  }

  async function chooseFile(file: File | undefined): Promise<void> {
    if (!file) return;
    setIsPending(true);
    setErrorMessage(null);
    setAnnouncement("");
    try {
      setPreview(await parseBackupFile(file));
    } catch (error) {
      setErrorMessage(
        messageFromError(error, "This backup file could not be read."),
      );
    } finally {
      setIsPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function importData(mode: ImportMode): Promise<void> {
    if (!preview) return;
    setIsPending(true);
    setErrorMessage(null);
    try {
      const result = await actions.importBackup(preview, mode);
      const recordLabel = result.totalImported === 1 ? "record" : "records";
      setAnnouncement(
        `${result.totalImported} ${recordLabel} imported by ${mode}. ${result.warning ?? "Backup settings and preferences applied."}`,
      );
      setPreview(null);
      window.setTimeout(() => uploadButtonRef.current?.focus());
    } catch (error) {
      setErrorMessage(
        messageFromError(error, "The backup could not be imported."),
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section
      aria-labelledby={`${fileInputId}-heading`}
      className={presentation.container}
    >
      <div className={compact ? "max-w-xl" : "max-w-2xl"}>
        {!isSettings ? (
          <p className="text-primary flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Local archive
          </p>
        ) : null}
        <Heading className={presentation.heading} id={`${fileInputId}-heading`}>
          {presentation.title}
        </Heading>
        <p className={presentation.descriptionClass}>
          {presentation.description}
        </p>
      </div>

      <div className={presentation.actions}>
        <Button
          variant="outline"
          className="border-border bg-surface-elevated text-foreground flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold disabled:opacity-45"
          disabled={isPending}
          onClick={() => void exportData()}
          type="button"
        >
          <Download aria-hidden="true" className="size-4" />
          {isPending ? "Working…" : "Export data"}
        </Button>
        <Button
          className="bg-primary text-accent-ink flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold disabled:opacity-45"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          ref={uploadButtonRef}
          type="button"
        >
          <FileUp aria-hidden="true" className="size-4" />
          Import backup
        </Button>
        <input
          accept="application/json,.json"
          aria-label="Choose backup file"
          className="sr-only"
          disabled={isPending}
          id={fileInputId}
          onChange={(event) => void chooseFile(event.target.files?.[0])}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {errorMessage && !preview ? (
        <p
          className="text-danger mt-4 text-sm leading-5 sm:col-span-2"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      <p
        aria-live="polite"
        className={
          announcement ? "text-success mt-4 text-sm sm:col-span-2" : "sr-only"
        }
        role="status"
      >
        {announcement}
      </p>

      {preview ? (
        <BackupPreviewDialog
          errorMessage={errorMessage}
          isPending={isPending}
          onClose={() => {
            setPreview(null);
            setErrorMessage(null);
            uploadButtonRef.current?.focus();
          }}
          onImport={importData}
          preview={preview}
        />
      ) : null}
    </section>
  );
}
