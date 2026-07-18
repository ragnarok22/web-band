"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { PracticePresetCard } from "@/components/practice/practice-preset-card";
import { usePracticeModal } from "@/hooks/use-practice-modal";
import type { PracticePreset } from "@/types/persistence";

type PresetFilter = "recent" | "favorites" | "all";

interface PracticePresetDialogProps {
  errorMessage: string | null;
  isHydrated: boolean;
  onClose: () => void;
  onDelete: (preset: PracticePreset) => Promise<boolean>;
  onDuplicate: (preset: PracticePreset) => Promise<boolean>;
  onFavorite: (preset: PracticePreset) => Promise<boolean>;
  onLoad: (preset: PracticePreset) => Promise<boolean>;
  onRename: (preset: PracticePreset, name: string) => Promise<boolean>;
  open: boolean;
  presets: PracticePreset[];
  recentPresetIds: string[];
}

const filterLabels: Record<PresetFilter, string> = {
  all: "All",
  favorites: "Favorites",
  recent: "Recent",
};
const filters: PresetFilter[] = ["recent", "favorites", "all"];

export function PracticePresetDialog({
  errorMessage,
  isHydrated,
  onClose,
  onDelete,
  onDuplicate,
  onFavorite,
  onLoad,
  onRename,
  open,
  presets,
  recentPresetIds,
}: PracticePresetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [filter, setFilter] = useState<PresetFilter>("recent");
  usePracticeModal(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const presetById = new Map(presets.map((preset) => [preset.id, preset]));
  const visiblePresets =
    filter === "recent"
      ? recentPresetIds.flatMap((id) => {
          const preset = presetById.get(id);
          return preset ? [preset] : [];
        })
      : filter === "favorites"
        ? presets.filter(({ isFavorite }) => isFavorite)
        : presets;
  const emptyMessage =
    filter === "recent"
      ? "No recent presets yet. Load one from All to start your list."
      : filter === "favorites"
        ? "No favorite presets yet. Use the heart to keep one close."
        : "No presets saved yet. Save the current setup to make your first one.";

  function closeDialog(): void {
    dialogRef.current?.close();
  }

  return (
    <dialog
      aria-labelledby={headingId}
      className="border-border bg-surface text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(94vw,46rem)] rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => {
        setFilter("recent");
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="border-border flex items-start justify-between gap-3 border-b p-4 sm:p-5">
          <div>
            <p className="text-accent flex items-center gap-2 text-[0.65rem] font-extrabold tracking-[0.15em] uppercase">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Saved setups
            </p>
            <h2
              className="mt-1 text-2xl font-black tracking-[-0.04em]"
              id={headingId}
            >
              Practice presets
            </h2>
          </div>
          <button
            aria-label="Close practice presets"
            className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div
          className="border-border grid grid-cols-3 border-b p-3 sm:px-5"
          role="tablist"
        >
          {filters.map((value) => (
            <button
              aria-selected={filter === value}
              className={`min-h-11 rounded-xl px-2 text-sm font-extrabold transition-colors ${filter === value ? "bg-accent text-accent-ink" : "text-muted-strong hover:bg-surface-hover hover:text-foreground"}`}
              key={value}
              onClick={() => setFilter(value)}
              role="tab"
              type="button"
            >
              {filterLabels[value]}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
          {errorMessage ? (
            <p
              className="border-danger/30 bg-danger/10 text-foreground mb-3 rounded-xl border p-3 text-sm"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}

          {!isHydrated ? (
            <p className="text-muted py-12 text-center text-sm font-bold">
              Loading presets…
            </p>
          ) : visiblePresets.length > 0 ? (
            <ul
              aria-label={`${filterLabels[filter]} presets`}
              className="grid list-none gap-3 p-0 sm:grid-cols-2"
              role="list"
            >
              {visiblePresets.map((preset) => (
                <li key={preset.id}>
                  <PracticePresetCard
                    onDelete={() => onDelete(preset)}
                    onDuplicate={() => onDuplicate(preset)}
                    onFavorite={() => onFavorite(preset)}
                    onLoad={() => onLoad(preset)}
                    onRename={(name) => onRename(preset, name)}
                    preset={preset}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-border rounded-2xl border border-dashed px-4 py-12 text-center">
              <p className="text-foreground font-black">Nothing here yet</p>
              <p className="text-muted mx-auto mt-2 max-w-sm text-sm leading-6">
                {emptyMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
