"use client";

import { Copy, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type MouseEvent, type RefObject } from "react";

import { ChordProgressionDeleteConfirmation } from "@/components/practice/chord-progression-delete-confirmation";
import { ChordProgressionEditorDialog } from "@/components/practice/chord-progression-editor-dialog";
import { builtInChordProgressions } from "@/data/chord-progressions";
import {
  useChordProgressionStore,
  type ChordProgressionInput,
} from "@/stores/chord-progression-store";
import type {
  ChordProgression,
  ChordTrainerConfiguration,
} from "@/types/practice";

interface ChordTrainerPanelProps {
  configuration: ChordTrainerConfiguration;
  disabled?: boolean;
  onChange: (configuration: ChordTrainerConfiguration) => void;
}

type EditorTarget = ChordProgression | "new" | null;

const buttonClass =
  "border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-45";

export function ChordTrainerPanel({
  configuration,
  disabled = false,
  onChange,
}: ChordTrainerPanelProps) {
  const customProgressions = useChordProgressionStore(
    (state) => state.customProgressions,
  );
  const favoriteProgressionIds = useChordProgressionStore(
    (state) => state.favoriteProgressionIds,
  );
  const progressionsHydrated = useChordProgressionStore(
    (state) => state.isHydrated,
  );
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
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const editorTriggerRef = useRef<HTMLButtonElement>(null);
  const progressionSelectRef = useRef<HTMLSelectElement>(null);
  const selected = configuration.progression;
  const availableSelected = selected.isBuiltIn
    ? builtInChordProgressions.find(({ id }) => id === selected.id)
    : customProgressions.find(({ id }) => id === selected.id);
  const selectedIsFavorite = favoriteProgressionIds.includes(selected.id);

  function selectProgression(progression: ChordProgression): void {
    setConfirmingDelete(false);
    onChange({ ...configuration, progression: structuredClone(progression) });
  }

  function openEditor(
    target: Exclude<EditorTarget, null>,
    event: MouseEvent<HTMLButtonElement>,
  ): void {
    editorTriggerRef.current = event.currentTarget;
    setEditorTarget(target);
  }

  function closeEditor(): void {
    setEditorTarget(null);
    editorTriggerRef.current?.focus();
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
    if (favoritePending || !availableSelected || !progressionsHydrated) return;
    setFavoritePending(true);
    try {
      await run(() => toggleFavorite(selected.id));
    } finally {
      setFavoritePending(false);
    }
  }

  async function removeSelectedProgression(): Promise<void> {
    if (!availableSelected || availableSelected.isBuiltIn) return;
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
      aria-labelledby="chord-trainer-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
    >
      <ChordTrainerHeader
        favoriteDisabled={
          disabled ||
          favoritePending ||
          !progressionsHydrated ||
          !availableSelected
        }
        isFavorite={selectedIsFavorite}
        onToggleFavorite={() => void toggleSelectedFavorite()}
        progressionName={selected.name}
      />

      <ProgressionSelect
        availableSelected={availableSelected}
        customProgressions={customProgressions}
        disabled={disabled}
        onSelect={selectProgression}
        selectRef={progressionSelectRef}
      />

      <ProgressionActions
        availableSelected={availableSelected}
        deleteTriggerRef={deleteTriggerRef}
        disabled={disabled}
        onCopy={() => void copySelectedProgression()}
        onOpenEditor={openEditor}
        onRequestDelete={() => setConfirmingDelete(true)}
      />

      {confirmingDelete && availableSelected ? (
        <ChordProgressionDeleteConfirmation
          name={availableSelected.name}
          onCancel={() => {
            setConfirmingDelete(false);
            deleteTriggerRef.current?.focus();
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

      <ChordTrainerOptions
        configuration={configuration}
        disabled={disabled}
        onChange={onChange}
      />

      <ChordSequence progression={availableSelected} />

      {errorMessage ? (
        <p className="text-danger mt-3 text-sm font-bold" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {editorTarget ? (
        <ChordProgressionEditorDialog
          disabled={disabled}
          key={editorTarget === "new" ? "new" : editorTarget.id}
          onClose={closeEditor}
          onSave={saveEditor}
          progression={editorTarget === "new" ? undefined : editorTarget}
        />
      ) : null}
    </section>
  );
}

interface ChordTrainerHeaderProps {
  favoriteDisabled: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  progressionName: string;
}

function ChordTrainerHeader({
  favoriteDisabled,
  isFavorite,
  onToggleFavorite,
  progressionName,
}: ChordTrainerHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
          Changes on cue
        </p>
        <h3
          className="text-foreground mt-1 text-lg font-black"
          id="chord-trainer-heading"
        >
          Chord trainer
        </h3>
      </div>
      <button
        aria-label={`${progressionName} favorite`}
        aria-pressed={isFavorite}
        className={`${buttonClass} min-w-11 px-0`}
        disabled={favoriteDisabled}
        onClick={onToggleFavorite}
        type="button"
      >
        <Heart
          aria-hidden="true"
          className={`size-4 ${isFavorite ? "fill-accent text-accent" : ""}`}
        />
      </button>
    </div>
  );
}

interface ProgressionSelectProps {
  availableSelected: ChordProgression | undefined;
  customProgressions: readonly ChordProgression[];
  disabled: boolean;
  onSelect: (progression: ChordProgression) => void;
  selectRef: RefObject<HTMLSelectElement | null>;
}

function ProgressionSelect({
  availableSelected,
  customProgressions,
  disabled,
  onSelect,
  selectRef,
}: ProgressionSelectProps) {
  return (
    <label className="text-muted-strong text-xs font-bold">
      Progression
      <select
        className="border-border bg-surface-elevated text-foreground focus:border-accent mt-1.5 min-h-11 w-full rounded-lg border px-3 text-sm font-bold outline-none disabled:opacity-45"
        disabled={disabled}
        onChange={(event) => {
          const progression = [
            ...builtInChordProgressions,
            ...customProgressions,
          ].find(({ id }) => id === event.target.value);
          if (progression) onSelect(progression);
        }}
        ref={selectRef}
        value={availableSelected?.id ?? ""}
      >
        {!availableSelected ? (
          <option disabled value="">
            Unavailable custom progression
          </option>
        ) : null}
        <optgroup label="Built-in progressions">
          {builtInChordProgressions.map((progression) => (
            <option key={progression.id} value={progression.id}>
              {progression.name}
            </option>
          ))}
        </optgroup>
        {customProgressions.length > 0 ? (
          <optgroup label="Custom progressions">
            {customProgressions.map((progression) => (
              <option key={progression.id} value={progression.id}>
                {progression.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
}

interface ProgressionActionsProps {
  availableSelected: ChordProgression | undefined;
  deleteTriggerRef: RefObject<HTMLButtonElement | null>;
  disabled: boolean;
  onCopy: () => void;
  onOpenEditor: (
    target: Exclude<EditorTarget, null>,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  onRequestDelete: () => void;
}

function ProgressionActions({
  availableSelected,
  deleteTriggerRef,
  disabled,
  onCopy,
  onOpenEditor,
  onRequestDelete,
}: ProgressionActionsProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        className={buttonClass}
        disabled={disabled}
        onClick={(event) => onOpenEditor("new", event)}
        type="button"
      >
        <Plus aria-hidden="true" className="size-4" />
        New
      </button>
      {availableSelected?.isBuiltIn ? (
        <button
          className={buttonClass}
          disabled={disabled}
          onClick={onCopy}
          type="button"
        >
          <Copy aria-hidden="true" className="size-4" />
          Copy built-in
        </button>
      ) : availableSelected ? (
        <>
          <button
            className={buttonClass}
            disabled={disabled}
            onClick={(event) => onOpenEditor(availableSelected, event)}
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </button>
          <button
            className={`${buttonClass} border-danger/30 text-danger`}
            disabled={disabled}
            onClick={onRequestDelete}
            ref={deleteTriggerRef}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </button>
        </>
      ) : null}
    </div>
  );
}

function ChordTrainerOptions({
  configuration,
  disabled,
  onChange,
}: ChordTrainerPanelProps) {
  return (
    <div className="border-border mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2">
      <label className="text-muted-strong flex min-h-11 items-center gap-3 text-sm font-bold">
        <input
          checked={configuration.repeat}
          className="accent-accent size-5"
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...configuration, repeat: event.target.checked })
          }
          type="checkbox"
        />
        Repeat progression
      </label>
      <label className="text-muted-strong flex min-h-11 items-center gap-3 text-sm font-bold">
        <input
          checked={configuration.showCountdown}
          className="accent-accent size-5"
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...configuration,
              showCountdown: event.target.checked,
            })
          }
          type="checkbox"
        />
        Show change countdown
      </label>
    </div>
  );
}

interface ChordSequenceProps {
  progression: ChordProgression | undefined;
}

function ChordSequence({ progression }: ChordSequenceProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Chord sequence">
      {progression?.steps.map((step) => (
        <span
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm font-black"
          key={step.id}
        >
          {step.chord}
          <span className="text-muted ml-2 text-[0.65rem] font-bold">
            {step.duration} {step.durationUnit}
          </span>
        </span>
      ))}
    </div>
  );
}
