"use client";
import { Button } from "@/components/ui/button";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import {
  DataBackupPanel,
  type DataBackupActions,
} from "@/components/data/data-backup-panel";
import { DeleteLocalDataDialog } from "@/components/settings/delete-local-data-dialog";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
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
import { useAppearanceStore } from "@/stores/appearance-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeStore } from "@/stores/practice-store";

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
  const appearanceHydrated = useAppearanceStore((state) => state.hasHydrated);
  const historySettingsHydrated = useHistorySettingsStore(
    (state) => state.hasHydrated,
  );
  const practiceHydrated = usePracticeStore((state) => state.hasHydrated);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  if (!appearanceHydrated || !historySettingsHydrated || !practiceHydrated) {
    return <SettingsSkeleton />;
  }

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
    <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[70rem] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-[-0.045em]">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Personalize your practice experience and manage your data.
        </p>
      </header>

      <div className="grid items-start gap-4 sm:gap-5 md:grid-cols-2">
        <AppearanceSettingsSection />

        <PracticeDefaultsSettingsSection />

        <SoundSettingsSection />

        <HistorySettingsSection />
      </div>

      <section aria-labelledby="data-privacy-heading" className="mt-7">
        <h2 id="data-privacy-heading" className="mb-3 text-base font-extrabold">
          Data &amp; privacy
        </h2>
        <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-5">
          <StorageStatusSection />
          <DataBackupPanel actions={actions} variant="settings" />
        </div>
      </section>

      <section aria-labelledby="advanced-actions-heading" className="mt-7">
        <h2
          id="advanced-actions-heading"
          className="mb-3 text-base font-extrabold"
        >
          Advanced actions
        </h2>
        <div className="border-border grid gap-5 border-t pt-4 md:grid-cols-2 md:gap-8">
          <div className="flex flex-col items-start">
            <h3 className="text-sm font-bold">Reset preferences</h3>
            <p className="text-muted-foreground mt-1 mb-3 text-xs leading-5">
              Restore application settings to their defaults without deleting
              your patterns, presets, favorites, or history.
            </p>
            <Button
              variant="outline"
              className="mt-auto min-h-11 gap-2 px-4"
              onClick={resetSettings}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset preferences
            </Button>
          </div>

          <div className="flex flex-col items-start">
            <h3 className="text-sm font-bold">Delete local data</h3>
            <p className="text-muted-foreground mt-1 mb-3 text-xs leading-5">
              Remove Web Band data and settings from this browser. A safety
              backup download starts before deletion. Other site storage is left
              alone.
            </p>
            <Button
              variant="destructive"
              className="mt-auto min-h-11 gap-2 px-4"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              ref={deleteButtonRef}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete local data
            </Button>
          </div>
        </div>
      </section>

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
