"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useId, useState } from "react";

import { PracticePresetCard } from "@/components/practice/practice-preset-card";
import { PracticePresetSkeleton } from "@/components/practice/practice-preset-skeleton";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const headingId = useId();
  const [filter, setFilter] = useState<PresetFilter>("recent");

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
    setFilter("recent");
    onClose();
  }

  return (
    <Modal
      aria-labelledby={headingId}
      className="p-0 sm:max-w-3xl"
      open={open}
      onClose={closeDialog}
    >
      <div className="flex max-h-[90vh] flex-col">
        <header className="border-border flex items-start justify-between gap-3 border-b p-4 sm:p-5">
          <div>
            <p className="text-primary flex items-center gap-2 text-[0.65rem] font-extrabold tracking-[0.15em] uppercase">
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close practice presets"
            className="size-11"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </header>

        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as PresetFilter)}
          className="min-h-0 gap-0"
        >
          <TabsList
            aria-label="Preset filters"
            className="m-3 grid min-h-12 w-auto grid-cols-3 sm:mx-5"
          >
            {filters.map((value) => (
              <TabsTrigger
                value={value}
                className="data-active:bg-primary data-active:text-primary-foreground min-h-11"
                key={value}
                type="button"
              >
                {filterLabels[value]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent
            value={filter}
            className="min-h-0 overflow-y-auto p-3 sm:p-5"
          >
            {errorMessage ? (
              <p
                className="border-danger/30 bg-danger/10 text-foreground mb-3 rounded-xl border p-3 text-sm"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            {!isHydrated ? (
              <PracticePresetSkeleton />
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
                <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-6">
                  {emptyMessage}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Modal>
  );
}
