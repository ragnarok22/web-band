"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  createChordStep,
  createProgressionDraft,
} from "@/components/practice/chord-progression-editor";
import { usePracticeModal } from "@/hooks/use-practice-modal";
import type { ChordProgressionInput } from "@/stores/chord-progression-store";
import type { ChordProgression, ChordStep } from "@/types/practice";

interface ChordProgressionEditorDialogProps {
  disabled?: boolean;
  onClose: () => void;
  onSave: (input: ChordProgressionInput) => Promise<void> | void;
  progression?: ChordProgression;
}

const inputClass =
  "border-border bg-background text-foreground focus:border-accent min-h-11 w-full rounded-lg border px-3 text-sm font-bold outline-none disabled:opacity-45";

export function ChordProgressionEditorDialog({
  disabled = false,
  onClose,
  onSave,
  progression,
}: ChordProgressionEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() => createProgressionDraft(progression));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  usePracticeModal(true);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  function closeDialog(): void {
    dialogRef.current?.close();
  }
  function updateStep(index: number, changes: Partial<ChordStep>): void {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...changes } : step,
      ),
    }));
  }
  function moveStep(index: number, direction: -1 | 1): void {
    setDraft((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.steps.length)
        return current;
      const steps = [...current.steps];
      [steps[index], steps[destination]] = [steps[destination]!, steps[index]!];
      return { ...current, steps };
    });
  }
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = draft.name.trim();
    const steps = draft.steps.map((step) => ({
      ...step,
      chord: step.chord.trim(),
    }));
    if (!name || name.length > 100) {
      setErrorMessage("Enter a progression name up to 100 characters.");
      return;
    }
    if (steps.some((step) => !step.chord || step.chord.length > 32)) {
      setErrorMessage("Every chord needs a name up to 32 characters.");
      return;
    }
    if (
      steps.some(
        (step) =>
          !Number.isInteger(step.duration) ||
          step.duration < 1 ||
          step.duration > 64,
      )
    ) {
      setErrorMessage(
        "Every chord duration must be a whole number from 1 to 64.",
      );
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onSave({ name, steps });
      closeDialog();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Progression could not be saved.",
      );
      setIsSaving(false);
    }
  }
  return (
    <dialog
      aria-labelledby="progression-editor-heading"
      className="border-border bg-surface text-foreground fixed inset-0 m-auto max-h-[92dvh] w-[min(94vw,44rem)] overflow-y-auto rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <form onSubmit={(event) => void save(event)}>
        <header className="border-border bg-surface sticky top-0 z-10 flex items-center justify-between border-b p-4 sm:p-5">
          <div>
            <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
              Progression editor
            </p>
            <h2
              className="mt-1 text-xl font-black"
              id="progression-editor-heading"
            >
              {progression ? "Edit progression" : "Create progression"}
            </h2>
          </div>
          <button
            aria-label="Close progression editor"
            className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 items-center justify-center rounded-lg"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <fieldset className="p-4 sm:p-5" disabled={disabled || isSaving}>
          <label className="text-muted-strong text-xs font-bold">
            Progression name
            <input
              className={`${inputClass} mt-1.5`}
              maxLength={100}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
              type="text"
              value={draft.name}
            />
          </label>
          <ol className="mt-5 grid gap-3">
            {draft.steps.map((step, index) => {
              const stepName = step.chord.trim() || `chord ${index + 1}`;
              return (
                <li
                  className="border-border bg-surface-elevated rounded-xl border p-3"
                  key={step.id}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-muted text-xs font-extrabold tracking-wider uppercase">
                      Step {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        aria-label={`Move ${stepName} up`}
                        className="border-border text-muted-strong flex size-11 items-center justify-center rounded-lg border disabled:opacity-35"
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                        type="button"
                      >
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        aria-label={`Move ${stepName} down`}
                        className="border-border text-muted-strong flex size-11 items-center justify-center rounded-lg border disabled:opacity-35"
                        disabled={index === draft.steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                        type="button"
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        aria-label={`Remove ${stepName}`}
                        className="border-danger/30 text-danger flex size-11 items-center justify-center rounded-lg border disabled:opacity-35"
                        disabled={draft.steps.length === 1}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            steps: current.steps.filter(
                              (_, stepIndex) => stepIndex !== index,
                            ),
                          }))
                        }
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 min-[420px]:grid-cols-[1fr_5.5rem_8.5rem]">
                    <label className="text-muted-strong text-xs font-bold">
                      Chord {index + 1}
                      <input
                        className={`${inputClass} mt-1.5`}
                        maxLength={32}
                        onChange={(event) =>
                          updateStep(index, { chord: event.target.value })
                        }
                        required
                        type="text"
                        value={step.chord}
                      />
                    </label>
                    <label className="text-muted-strong text-xs font-bold">
                      Duration
                      <input
                        aria-label={`Duration for chord ${index + 1}`}
                        className={`${inputClass} mt-1.5`}
                        max={64}
                        min={1}
                        onChange={(event) =>
                          updateStep(index, {
                            duration: event.target.valueAsNumber,
                          })
                        }
                        required
                        type="number"
                        value={step.duration}
                      />
                    </label>
                    <label className="text-muted-strong text-xs font-bold">
                      Unit
                      <select
                        aria-label={`Duration unit for chord ${index + 1}`}
                        className={`${inputClass} mt-1.5`}
                        onChange={(event) =>
                          updateStep(index, {
                            durationUnit: event.target
                              .value as ChordStep["durationUnit"],
                          })
                        }
                        value={step.durationUnit}
                      >
                        <option value="beats">Beats</option>
                        <option value="measures">Measures</option>
                      </select>
                    </label>
                  </div>
                </li>
              );
            })}
          </ol>
          <button
            className="border-border text-muted-strong hover:border-border-strong hover:text-foreground mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-extrabold disabled:opacity-45"
            disabled={draft.steps.length >= 64}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                steps: [...current.steps, createChordStep()],
              }))
            }
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add chord
          </button>
          {errorMessage ? (
            <p className="text-danger mt-3 text-sm font-bold" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end">
            <button
              className="border-border text-muted-strong min-h-11 rounded-lg border px-4 text-sm font-extrabold"
              onClick={closeDialog}
              type="button"
            >
              Cancel
            </button>
            <button
              className="bg-accent text-accent-ink min-h-11 rounded-lg px-5 text-sm font-black disabled:opacity-45"
              type="submit"
            >
              {isSaving ? "Saving…" : "Save progression"}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
