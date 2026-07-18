"use client";

import { Database, Settings2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import {
  DataBackupPanel,
  type DataBackupActions,
} from "@/components/data/data-backup-panel";
import { DeleteLocalDataDialog } from "@/components/settings/delete-local-data-dialog";
import {
  backupService,
  type ClearLocalDataCompletion,
} from "@/services/backup-service";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { useStorageStore } from "@/stores/storage-store";

interface SettingsActions extends DataBackupActions {
  clearAllLocalData: () => Promise<ClearLocalDataCompletion>;
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
  const historyEnabled = useHistorySettingsStore((state) => state.enabled);
  const minimumDuration = useHistorySettingsStore(
    (state) => state.minimumDurationSeconds,
  );
  const setHistoryEnabled = useHistorySettingsStore(
    (state) => state.setEnabled,
  );
  const setMinimumDuration = useHistorySettingsStore(
    (state) => state.setMinimumDurationSeconds,
  );
  const storageMode = useStorageStore((state) => state.mode);
  const storageWarning = useStorageStore((state) => state.warning);
  const [minimumDurationInput, setMinimumDurationInput] = useState<
    string | null
  >(null);
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
          Manage practice history and the data saved locally in this browser.
        </p>
      </header>

      <div className="mt-8 space-y-6 sm:mt-10">
        <section
          aria-labelledby="history-settings-heading"
          className="border-border bg-surface/70 rounded-3xl border p-5 sm:p-7"
        >
          <h2 className="text-2xl font-black" id="history-settings-heading">
            Practice history
          </h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Choose whether completed practice sessions become journal entries.
          </p>
          <div className="border-border mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2">
            <label className="flex min-h-11 items-center justify-between gap-4 text-sm font-extrabold">
              Save practice history
              <input
                checked={historyEnabled}
                className="size-6 accent-[var(--accent)]"
                onChange={(event) => setHistoryEnabled(event.target.checked)}
                type="checkbox"
              />
            </label>
            <div className="text-sm font-extrabold">
              <label htmlFor="history-minimum-duration">
                Minimum session duration
              </label>
              <span className="border-border bg-background mt-2 flex min-h-11 items-center rounded-xl border px-3">
                <input
                  className="text-foreground min-w-0 flex-1 bg-transparent py-2 outline-none"
                  id="history-minimum-duration"
                  max={3600}
                  min={0}
                  onChange={(event) => {
                    setMinimumDurationInput(event.currentTarget.value);
                    if (event.currentTarget.value !== "") {
                      setMinimumDuration(event.currentTarget.valueAsNumber);
                    }
                  }}
                  onBlur={() => setMinimumDurationInput(null)}
                  step={1}
                  type="number"
                  value={minimumDurationInput ?? minimumDuration}
                />
                <span className="text-muted text-xs">seconds</span>
              </span>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="storage-status-heading"
          className="border-border bg-surface/70 rounded-3xl border p-5 sm:p-7"
        >
          <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
            <Database aria-hidden="true" className="size-4" />
            Storage status
          </p>
          <h2 className="mt-2 text-2xl font-black" id="storage-status-heading">
            {storageMode === "indexed-db"
              ? "Saved on this device"
              : "Visit-only storage"}
          </h2>
          <p className="text-muted mt-2 text-sm leading-6">
            {storageMode === "indexed-db"
              ? "Patterns, presets, favorites, and journal entries stay in this browser. Nothing is uploaded to a server."
              : (storageWarning ??
                "Browser database storage is unavailable, so new data lasts only for this visit.")}
          </p>
        </section>

        <DataBackupPanel actions={actions} />

        <section
          aria-labelledby="danger-heading"
          className="border-danger/30 bg-danger/5 rounded-3xl border p-5 sm:p-7"
        >
          <h2 className="text-2xl font-black" id="danger-heading">
            Delete local data
          </h2>
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
            Remove only Web Band data and settings from this browser. Other site
            storage is left alone, and a backup downloads before deletion.
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
