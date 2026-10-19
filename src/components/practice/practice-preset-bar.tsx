"use client";
import { Button } from "@/components/ui/button";

import { ChevronDown, FolderOpen, Save } from "lucide-react";
import { useState } from "react";

import { PracticePresetDialog } from "@/components/practice/practice-preset-dialog";
import { getPracticeSetupSummary } from "@/components/practice/practice-preset-format";
import { SavePracticePresetDialog } from "@/components/practice/save-practice-preset-dialog";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePracticeModal } from "@/hooks/use-practice-modal";
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
  const [menuOpen, setMenuOpen] = useState(false);
  usePracticeModal(menuOpen);

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
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
      <div className={loadedPresetName ? "order-3 w-full min-w-0" : "sr-only"}>
        <p className="text-primary text-[0.65rem] font-extrabold tracking-[0.14em] uppercase">
          {loadedPresetName ? `Loaded: ${loadedPresetName}` : "Current setup"}
        </p>
        <p className="sr-only">{getPracticeSetupSummary(configuration)}</p>
      </div>
      <div className="flex flex-row-reverse gap-2">
        <Button
          variant="outline"
          aria-label="Save current setup"
          className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold"
          onClick={() => {
            setErrorMessage(null);
            setSaveOpen(true);
          }}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          Save
        </Button>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                aria-label="Open presets"
                className="min-h-11 gap-2 px-3"
              />
            }
          >
            <FolderOpen aria-hidden="true" className="size-4" />
            Presets
            <ChevronDown aria-hidden="true" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 max-w-[calc(100vw-2rem)]"
          >
            {recentPresetIds.slice(0, 5).flatMap((id) => {
              const preset = presets.find((candidate) => candidate.id === id);
              return preset
                ? [
                    <DropdownMenuItem
                      key={id}
                      className="min-h-11 wrap-anywhere"
                      onClick={() => {
                        setMenuOpen(false);
                        void loadPreset(preset).then((loaded) => {
                          if (!loaded) setPresetsOpen(true);
                        });
                      }}
                    >
                      Load {preset.name}
                    </DropdownMenuItem>,
                  ]
                : [];
            })}
            {recentPresetIds.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className="min-h-11"
              onClick={() => {
                setErrorMessage(null);
                setPresetsOpen(true);
              }}
            >
              Manage presets
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
