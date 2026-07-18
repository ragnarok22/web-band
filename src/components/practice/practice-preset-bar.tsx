"use client";

import { FolderOpen, Save } from "lucide-react";
import { useState } from "react";

import { PracticePresetDialog } from "@/components/practice/practice-preset-dialog";
import { getPracticeSetupSummary } from "@/components/practice/practice-preset-format";
import { SavePracticePresetDialog } from "@/components/practice/save-practice-preset-dialog";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import type {
  PracticePreset,
  PracticePresetConfiguration,
} from "@/types/persistence";

interface PracticePresetBarProps {
  configuration: PracticePresetConfiguration;
  loadedPresetName?: string | null;
  onLoad: (preset: PracticePreset) => Promise<void> | void;
}

export function PracticePresetBar({
  configuration,
  loadedPresetName = null,
  onLoad,
}: PracticePresetBarProps) {
  const createSnapshot = usePracticePresetStore(
    (state) => state.createSnapshot,
  );
  const deletePreset = usePracticePresetStore((state) => state.delete);
  const duplicate = usePracticePresetStore((state) => state.duplicate);
  const isHydrated = usePracticePresetStore((state) => state.isHydrated);
  const markUsed = usePracticePresetStore((state) => state.markUsed);
  const presets = usePracticePresetStore((state) => state.presets);
  const recentPresetIds = usePracticePresetStore(
    (state) => state.recentPresetIds,
  );
  const rename = usePracticePresetStore((state) => state.rename);
  const toggleFavorite = usePracticePresetStore(
    (state) => state.toggleFavorite,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  async function runAction(
    action: () => Promise<unknown> | unknown,
    fallbackMessage: string,
  ): Promise<boolean> {
    setErrorMessage(null);
    try {
      await action();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
      return false;
    }
  }

  async function loadPreset(preset: PracticePreset): Promise<boolean> {
    const loaded = await runAction(
      () => onLoad(preset),
      "Practice preset could not be loaded.",
    );
    if (!loaded) return false;

    const markedUsed = await runAction(
      () => markUsed(preset.id),
      "Recent presets could not be updated.",
    );
    if (markedUsed) setPresetsOpen(false);
    return markedUsed;
  }

  return (
    <section
      aria-label="Practice preset controls"
      className="border-border bg-surface flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
    >
      <div className="min-w-0">
        <p className="text-accent text-[0.65rem] font-extrabold tracking-[0.14em] uppercase">
          {loadedPresetName ? `Loaded: ${loadedPresetName}` : "Current setup"}
        </p>
        <p className="text-muted-strong mt-1 truncate text-sm font-bold">
          {getPracticeSetupSummary(configuration)}
        </p>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <button
          aria-label="Save current setup"
          className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold"
          onClick={() => {
            setErrorMessage(null);
            setSaveOpen(true);
          }}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          Save setup
        </button>
        <button
          aria-label="Open presets"
          className="bg-accent text-accent-ink hover:bg-accent-strong flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold"
          onClick={() => {
            setErrorMessage(null);
            setPresetsOpen(true);
          }}
          type="button"
        >
          <FolderOpen aria-hidden="true" className="size-4" />
          Presets
        </button>
      </div>

      <SavePracticePresetDialog
        errorMessage={saveOpen ? errorMessage : null}
        onClose={() => setSaveOpen(false)}
        onSave={(name) =>
          runAction(
            () => createSnapshot({ configuration, name }),
            "Practice preset could not be saved.",
          )
        }
        open={saveOpen}
      />
      <PracticePresetDialog
        errorMessage={presetsOpen ? errorMessage : null}
        isHydrated={isHydrated}
        onClose={() => setPresetsOpen(false)}
        onDelete={(preset) =>
          runAction(
            () => deletePreset(preset.id),
            "Practice preset could not be deleted.",
          )
        }
        onDuplicate={(preset) =>
          runAction(
            () => duplicate(preset.id),
            "Practice preset could not be duplicated.",
          )
        }
        onFavorite={(preset) =>
          runAction(
            () => toggleFavorite(preset.id),
            "Favorite could not be saved.",
          )
        }
        onLoad={loadPreset}
        onRename={(preset, name) =>
          runAction(
            () => rename(preset.id, name),
            "Practice preset could not be renamed.",
          )
        }
        open={presetsOpen}
        presets={presets}
        recentPresetIds={recentPresetIds}
      />
    </section>
  );
}
