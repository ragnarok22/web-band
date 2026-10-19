"use client";

import { Copy, Ellipsis, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { ChordProgressionDeleteConfirmation } from "@/components/practice/chord-progression-delete-confirmation";
import { ChordProgressionEditorDialog } from "@/components/practice/chord-progression-editor-dialog";
import styles from "@/components/practice/chord-practice.module.css";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { builtInChordProgressions } from "@/data/chord-progressions";
import {
  useChordProgressionStore,
  type ChordProgressionInput,
} from "@/stores/chord-progression-store";
import type { TimeSignature } from "@/types/pattern";
import type {
  ChordProgression,
  ChordTrainerConfiguration,
} from "@/types/practice";

interface ChordProgressionSelectorProps {
  configuration: ChordTrainerConfiguration;
  disabled?: boolean;
  onChange: (configuration: ChordTrainerConfiguration) => void;
  timeSignature: TimeSignature;
}

type EditorTarget = ChordProgression | "new" | null;

export function ChordProgressionSelector({
  configuration,
  disabled = false,
  onChange,
  timeSignature,
}: ChordProgressionSelectorProps) {
  const customProgressions = useChordProgressionStore(
    (state) => state.customProgressions,
  );
  const favoriteProgressionIds = useChordProgressionStore(
    (state) => state.favoriteProgressionIds,
  );
  const isHydrated = useChordProgressionStore((state) => state.isHydrated);
  const copyBuiltIn = useChordProgressionStore((state) => state.copyBuiltIn);
  const create = useChordProgressionStore((state) => state.create);
  const deleteProgression = useChordProgressionStore((state) => state.delete);
  const toggleFavorite = useChordProgressionStore(
    (state) => state.toggleFavorite,
  );
  const update = useChordProgressionStore((state) => state.update);
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);
  const progressionSelectRef = useRef<HTMLSelectElement>(null);
  const selected = configuration.progression;
  const available = [...builtInChordProgressions, ...customProgressions];
  const availableSelected = selected.isBuiltIn
    ? builtInChordProgressions.find(({ id }) => id === selected.id)
    : customProgressions.find(({ id }) => id === selected.id);
  const selectedIsFavorite = favoriteProgressionIds.includes(selected.id);
  const controlsDisabled = disabled || !isHydrated;
  const groups = [
    {
      label: "Favorite progressions",
      progressions: available.filter(({ id }) =>
        favoriteProgressionIds.includes(id),
      ),
    },
    {
      label: "Built-in progressions",
      progressions: builtInChordProgressions.filter(
        ({ id }) => !favoriteProgressionIds.includes(id),
      ),
    },
    {
      label: "Custom progressions",
      progressions: customProgressions.filter(
        ({ id }) => !favoriteProgressionIds.includes(id),
      ),
    },
  ];

  function selectProgression(progression: ChordProgression): void {
    setConfirmingDelete(false);
    onChange({ ...configuration, progression: structuredClone(progression) });
  }

  function closeEditor(): void {
    setEditorTarget(null);
    actionsTriggerRef.current?.focus();
  }

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    setErrorMessage(null);
    try {
      return await action();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Progression change could not be saved.",
      );
    }
  }

  async function copySelectedProgression(): Promise<void> {
    if (!availableSelected?.isBuiltIn) return;
    const copied = await run(() => copyBuiltIn(availableSelected.id));
    if (copied) selectProgression(copied);
  }

  async function toggleSelectedFavorite(): Promise<void> {
    if (favoritePending || !availableSelected || controlsDisabled) return;
    setFavoritePending(true);
    try {
      await run(() => toggleFavorite(selected.id));
    } finally {
      setFavoritePending(false);
    }
  }

  async function removeSelectedProgression(): Promise<void> {
    if (!availableSelected || availableSelected.isBuiltIn || controlsDisabled)
      return;
    const deleted = await run(async () => {
      await deleteProgression(availableSelected.id);
      return true;
    });
    if (deleted) {
      selectProgression(builtInChordProgressions[0]!);
      window.requestAnimationFrame(() => progressionSelectRef.current?.focus());
    }
  }

  async function saveEditor(input: ChordProgressionInput): Promise<void> {
    const saved =
      editorTarget && editorTarget !== "new"
        ? await update(editorTarget.id, input)
        : await create(input);
    selectProgression(saved);
  }

  return (
    <section
      aria-label="Chord progression setup"
      className="min-w-0 px-4 pt-4 sm:px-6"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
          Chord practice
        </h2>
        <p className="text-muted-foreground text-xs tabular-nums">
          {selected.steps.length}{" "}
          {selected.steps.length === 1 ? "chord" : "chords"} ·{" "}
          {timeSignature.numerator}/{timeSignature.denominator} ·{" "}
          {configuration.repeat ? "Repeat enabled" : "Play once"}
        </p>
      </div>
      <div className={styles.setupRow}>
        <div className={styles.selection}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Progression</span>
            <NativeSelect
              className="min-w-0 [&_select]:font-bold"
              disabled={controlsDisabled}
              onChange={(event) => {
                const progression = available.find(
                  ({ id }) => id === event.target.value,
                );
                if (progression) selectProgression(progression);
              }}
              ref={progressionSelectRef}
              value={availableSelected?.id ?? ""}
            >
              {!availableSelected ? (
                <option disabled value="">
                  Unavailable custom progression
                </option>
              ) : null}
              {groups
                .filter(({ progressions }) => progressions.length > 0)
                .map(({ label, progressions }) => (
                  <optgroup key={label} label={label}>
                    {progressions.map((progression) => (
                      <option key={progression.id} value={progression.id}>
                        {progression.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </NativeSelect>
          </label>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${selected.name} favorite`}
            aria-pressed={selectedIsFavorite}
            className="size-11 shrink-0"
            disabled={controlsDisabled || favoritePending || !availableSelected}
            onClick={() => void toggleSelectedFavorite()}
            type="button"
          >
            <Heart
              aria-hidden="true"
              className={`size-4 ${selectedIsFavorite ? "fill-primary text-primary" : ""}`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" />}
              aria-label="Progression actions"
              className="size-11 shrink-0"
              disabled={controlsDisabled}
              ref={actionsTriggerRef}
            >
              <Ellipsis aria-hidden="true" className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="min-h-11"
                onClick={() => setEditorTarget("new")}
              >
                <Plus aria-hidden="true" />
                New progression
              </DropdownMenuItem>
              {availableSelected?.isBuiltIn ? (
                <DropdownMenuItem
                  className="min-h-11"
                  onClick={() => void copySelectedProgression()}
                >
                  <Copy aria-hidden="true" />
                  Copy built-in
                </DropdownMenuItem>
              ) : availableSelected ? (
                <>
                  <DropdownMenuItem
                    className="min-h-11"
                    onClick={() => setEditorTarget(availableSelected)}
                  >
                    <Pencil aria-hidden="true" />
                    Edit progression
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11"
                    onClick={() => setConfirmingDelete(true)}
                    variant="destructive"
                  >
                    <Trash2 aria-hidden="true" />
                    Delete progression
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="text-muted-strong flex flex-wrap items-center gap-x-5 text-xs font-bold">
          <label className="flex min-h-11 items-center gap-2">
            <Checkbox
              aria-label="Repeat progression"
              checked={configuration.repeat}
              disabled={controlsDisabled}
              onCheckedChange={(checked) =>
                onChange({ ...configuration, repeat: checked })
              }
            />
            Repeat
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <Checkbox
              aria-label="Show change countdown"
              checked={configuration.showCountdown}
              disabled={controlsDisabled}
              onCheckedChange={(checked) =>
                onChange({ ...configuration, showCountdown: checked })
              }
            />
            Countdown
          </label>
        </div>
      </div>
      {confirmingDelete && availableSelected ? (
        <ChordProgressionDeleteConfirmation
          name={availableSelected.name}
          onCancel={() => {
            setConfirmingDelete(false);
            actionsTriggerRef.current?.focus();
          }}
          onConfirm={() => void removeSelectedProgression()}
        />
      ) : null}
      {!availableSelected ? (
        <p className="text-danger mt-3 text-sm font-bold" role="alert">
          The selected custom progression is no longer available. Choose another
          progression.
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-danger mt-3 text-sm font-bold" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {editorTarget ? (
        <ChordProgressionEditorDialog
          disabled={controlsDisabled}
          key={editorTarget === "new" ? "new" : editorTarget.id}
          onClose={closeEditor}
          onSave={saveEditor}
          progression={editorTarget === "new" ? undefined : editorTarget}
        />
      ) : null}
    </section>
  );
}
