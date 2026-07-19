"use client";

import { RotateCcw, Settings2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import {
  DataBackupPanel,
  type DataBackupActions,
} from "@/components/data/data-backup-panel";
import { DeleteLocalDataDialog } from "@/components/settings/delete-local-data-dialog";
import {
  AppearanceSettingsSection,
  HistorySettingsSection,
  PracticeDefaultsSettingsSection,
  SoundSettingsSection,
  StorageStatusSection,
} from "@/components/settings/settings-preference-sections";
import {
  backupService,
  type ClearLocalDataCompletion,
  type ResetSettingsCompletion,
} from "@/services/backup-service";

interface SettingsActions extends DataBackupActions {
  clearAllLocalData: () => Promise<ClearLocalDataCompletion>;
  resetSettings: () => ResetSettingsCompletion;
}

interface SettingsScreenProps {
  actions?: SettingsActions;
}

function messageFromError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Local data could not be deleted.";
}

export function SettingsScreen({
  actions = backupService,
}: SettingsScreenProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  async function deleteLocalData(): Promise<void> {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await actions.clearAllLocalData();
      setAnnouncement(
        result.warning ?? "All Web Band data on this device was deleted.",
      );
      setDeleteOpen(false);
      window.setTimeout(() => deleteButtonRef.current?.focus());
    } catch (error) {
      setDeleteError(messageFromError(error));
    } finally {
      setIsDeleting(false);
    }
  }

  function resetSettings(): void {
    try {
      const result = actions.resetSettings();
      setAnnouncement(
        result.warning ??
          "Settings were reset. Your patterns, presets, favorites, and practice history were preserved.",
      );
    } catch {
      setAnnouncement("Settings could not be reset.");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-7 sm:py-12 lg:px-10 lg:py-16">
      <header className="border-border border-b pb-8 sm:pb-10">
        <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] uppercase">
          <Settings2 aria-hidden="true" className="size-4" />
          Device preferences
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
          Settings, kept simple.
        </h1>
        <p className="text-muted mt-4 max-w-2xl leading-7">
          Manage appearance, practice history, and data saved in this browser.
        </p>
      </header>

      <div className="mt-8 space-y-6 sm:mt-10">
        <AppearanceSettingsSection />

        <PracticeDefaultsSettingsSection />

        <SoundSettingsSection />

        <HistorySettingsSection />

        <StorageStatusSection />

        <DataBackupPanel actions={actions} />

        <section
          aria-labelledby="reset-settings-heading"
          className="border-border bg-surface/70 rounded-3xl border p-5 sm:p-7"
        >
          <h2 className="text-2xl font-black" id="reset-settings-heading">
            Reset settings
          </h2>
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
            Return app preferences to their defaults without removing patterns,
            presets, favorites, or practice history.
          </p>
          <button
            className="border-border text-foreground hover:bg-surface-hover mt-5 flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold"
            onClick={resetSettings}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset settings to defaults
          </button>
        </section>

        <section
          aria-labelledby="danger-heading"
          className="border-danger/30 bg-danger/5 rounded-3xl border p-5 sm:p-7"
        >
          <h2 className="text-2xl font-black" id="danger-heading">
            Delete local data
          </h2>
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
            Remove only Web Band data and settings from this browser. Other site
            storage is left alone, and a backup download is started before
            deletion.
          </p>
          <button
            className="border-danger/45 text-danger mt-5 flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold"
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
            ref={deleteButtonRef}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete all local data
          </button>
        </section>
      </div>

      <p
        aria-live="polite"
        className={announcement ? "text-success mt-6 text-sm" : "sr-only"}
        role="status"
      >
        {announcement}
      </p>
      {deleteOpen ? (
        <DeleteLocalDataDialog
          errorMessage={deleteError}
          isPending={isDeleting}
          onClose={() => {
            setDeleteOpen(false);
            deleteButtonRef.current?.focus();
          }}
          onConfirm={deleteLocalData}
        />
      ) : null}
    </main>
  );
}
