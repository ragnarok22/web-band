"use client";

import { Check, Copy, Heart, Pencil, Play, Trash2, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  getPracticeModeLabel,
  getPracticePatternSummary,
} from "@/components/practice/practice-preset-format";
import type { PracticePreset } from "@/types/persistence";

interface PracticePresetCardProps {
  onDelete: () => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onFavorite: () => Promise<boolean>;
  onLoad: () => Promise<boolean>;
  onRename: (name: string) => Promise<boolean>;
  preset: PracticePreset;
}

type PendingAction = "delete" | "duplicate" | "favorite" | "load" | "rename";

export function PracticePresetCard({
  onDelete,
  onDuplicate,
  onFavorite,
  onLoad,
  onRename,
  preset,
}: PracticePresetCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState(preset.name);
  const isPending = pendingAction !== null;

  async function runAction(
    action: PendingAction,
    operation: () => Promise<boolean>,
  ): Promise<boolean> {
    setPendingAction(action);
    const succeeded = await operation();
    setPendingAction(null);
    return succeeded;
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = renameValue.trim();
    if (!name) {
      setRenameError("Enter a preset name.");
      return;
    }
    setRenameError(null);
    if (await runAction("rename", () => onRename(name))) setIsRenaming(false);
  }

  return (
    <article className="border-border bg-surface-elevated rounded-2xl border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <form className="flex flex-col gap-2" onSubmit={submitRename}>
              <label className="sr-only" htmlFor={`rename-${preset.id}`}>
                Rename {preset.name}
              </label>
              <input
                autoFocus
                className="border-accent bg-background text-foreground min-h-11 w-full rounded-xl border px-3 text-base font-black outline-none"
                id={`rename-${preset.id}`}
                maxLength={100}
                onChange={(event) => {
                  setRenameValue(event.target.value);
                  setRenameError(null);
                }}
                required
                value={renameValue}
              />
              {renameError ? (
                <p className="text-danger text-sm font-bold" role="alert">
                  {renameError}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="border-border text-muted-strong hover:bg-surface-hover flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold"
                  disabled={isPending}
                  onClick={() => {
                    setRenameValue(preset.name);
                    setRenameError(null);
                    setIsRenaming(false);
                  }}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                  Cancel
                </button>
                <button
                  className="bg-accent text-accent-ink hover:bg-accent-strong flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold"
                  disabled={isPending}
                  type="submit"
                >
                  <Check aria-hidden="true" className="size-4" />
                  {pendingAction === "rename" ? "Saving..." : "Save name"}
                </button>
              </div>
            </form>
          ) : (
            <h3 className="text-foreground truncate text-lg font-black tracking-[-0.03em]">
              {preset.name}
            </h3>
          )}
        </div>
        <button
          aria-label={`${preset.isFavorite ? "Remove" : "Add"} ${preset.name} ${preset.isFavorite ? "from" : "to"} favorites`}
          aria-pressed={preset.isFavorite}
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${preset.isFavorite ? "border-secondary-accent/40 bg-secondary-accent/12 text-secondary-accent" : "border-border text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground"}`}
          disabled={isPending}
          onClick={() => void runAction("favorite", onFavorite)}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={`size-5 ${preset.isFavorite ? "fill-current" : ""}`}
          />
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
        <div>
          <dt className="text-muted text-[0.62rem] font-extrabold tracking-wider uppercase">
            Mode
          </dt>
          <dd className="text-muted-strong mt-1 font-bold">
            {getPracticeModeLabel(preset.configuration.guidedPractice.mode)}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-[0.62rem] font-extrabold tracking-wider uppercase">
            Tempo
          </dt>
          <dd className="text-foreground mt-1 font-black tabular-nums">
            {preset.configuration.bpm} BPM
          </dd>
        </div>
        <div className="col-span-2 mt-2">
          <dt className="text-muted text-[0.62rem] font-extrabold tracking-wider uppercase">
            Pattern
          </dt>
          <dd className="text-muted-strong mt-1 truncate font-bold">
            {getPracticePatternSummary(preset.configuration)}
          </dd>
        </div>
      </dl>

      {confirmingDelete ? (
        <div className="border-danger/30 bg-danger/10 mt-4 rounded-xl border p-3">
          <p className="text-foreground text-sm font-bold">
            Delete {preset.name} permanently?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="border-border text-muted-strong hover:bg-surface-hover min-h-11 rounded-xl border px-3 text-sm font-extrabold"
              disabled={isPending}
              onClick={() => setConfirmingDelete(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              aria-label={`Delete ${preset.name} permanently`}
              className="bg-danger text-background min-h-11 rounded-xl px-3 text-sm font-black"
              disabled={isPending}
              onClick={() =>
                void runAction("delete", onDelete).then((succeeded) => {
                  if (succeeded) setConfirmingDelete(false);
                })
              }
              type="button"
            >
              {pendingAction === "delete" ? "Deleting..." : "Delete preset"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-5 gap-2">
          <button
            aria-label={`Load ${preset.name}`}
            className="bg-accent text-accent-ink hover:bg-accent-strong col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold"
            disabled={isPending}
            onClick={() => void runAction("load", onLoad)}
            type="button"
          >
            <Play aria-hidden="true" className="size-4 fill-current" />
            {pendingAction === "load" ? "Loading..." : "Load"}
          </button>
          <CardAction
            disabled={isPending}
            label={`Rename ${preset.name}`}
            onClick={() => {
              setRenameValue(preset.name);
              setRenameError(null);
              setIsRenaming(true);
            }}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </CardAction>
          <CardAction
            disabled={isPending}
            label={`Duplicate ${preset.name}`}
            onClick={() => void runAction("duplicate", onDuplicate)}
          >
            <Copy aria-hidden="true" className="size-4" />
          </CardAction>
          <CardAction
            disabled={isPending}
            label={`Delete ${preset.name}`}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 aria-hidden="true" className="text-danger size-4" />
          </CardAction>
        </div>
      )}
    </article>
  );
}

interface CardActionProps {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

function CardAction({ children, disabled, label, onClick }: CardActionProps) {
  return (
    <button
      aria-label={label}
      className="border-border text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 items-center justify-center rounded-xl border"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
