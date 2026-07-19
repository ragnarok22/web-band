"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { strumActionDetails } from "@/components/practice/strum-action-details";
import {
  createStrummingPatternDraft,
  resizeStrummingSteps,
} from "@/components/practice/strumming-pattern-editor";
import { usePracticeModal } from "@/hooks/use-practice-modal";
import { getBeatLabels } from "@/lib/musical-time";
import type { StrummingPatternInput } from "@/stores/strumming-pattern-store";
import type { TimeSignature } from "@/types/pattern";
import type { StrumAction, StrummingPattern } from "@/types/practice";

interface StrummingPatternEditorDialogProps {
  disabled?: boolean;
  onClose: () => void;
  onSave: (input: StrummingPatternInput) => Promise<void> | void;
  pattern?: StrummingPattern;
  timeSignature: TimeSignature;
}

const actions: StrumAction[] = ["down", "up", "mute", "rest", "hold"];
const inputClass =
  "border-border bg-background text-foreground focus:border-accent min-h-11 w-full rounded-lg border px-3 text-sm font-bold outline-none disabled:opacity-45";

export function StrummingPatternEditorDialog({
  disabled = false,
  onClose,
  onSave,
  pattern,
  timeSignature,
}: StrummingPatternEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() =>
    createStrummingPatternDraft(timeSignature, pattern),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const labels = getBeatLabels(draft);
  usePracticeModal(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function closeDialog(): void {
    dialogRef.current?.close();
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name || name.length > 100) {
      setErrorMessage("Enter a pattern name up to 100 characters.");
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onSave({ ...draft, name });
      closeDialog();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Strumming pattern could not be saved.",
      );
      setIsSaving(false);
    }
  }

  return (
    <dialog
      aria-labelledby="strumming-pattern-editor-heading"
      className="border-border bg-surface text-foreground fixed inset-0 m-auto max-h-[92dvh] w-[min(94vw,52rem)] overflow-y-auto rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop:bg-black/75"
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
              Right-hand pattern editor
            </p>
            <h2
              className="mt-1 text-xl font-black"
              id="strumming-pattern-editor-heading"
            >
              {pattern ? "Edit strumming pattern" : "Create strumming pattern"}
            </h2>
          </div>
          <button
            aria-label="Close strumming pattern editor"
            className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 items-center justify-center rounded-lg"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <fieldset className="p-4 sm:p-5" disabled={disabled || isSaving}>
          <div className="grid gap-3 sm:grid-cols-[1fr_11rem_8rem]">
            <label className="text-muted-strong text-xs font-bold">
              Pattern name
              <input
                autoComplete="off"
                className={`${inputClass} mt-1.5`}
                maxLength={100}
                name="strumming-pattern-name"
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
            <label className="text-muted-strong text-xs font-bold">
              Subdivision
              <select
                className={`${inputClass} mt-1.5`}
                name="strumming-pattern-subdivision"
                onChange={(event) => {
                  const subdivision = Number(event.target.value) as 8 | 16;
                  setDraft((current) => ({
                    ...current,
                    steps: resizeStrummingSteps(
                      current.steps,
                      current.subdivision,
                      subdivision,
                      current.timeSignature,
                    ),
                    subdivision,
                  }));
                }}
                value={draft.subdivision}
              >
                <option value={8}>Eighth notes</option>
                <option value={16}>Sixteenth notes</option>
              </select>
            </label>
            <div className="text-muted-strong text-xs font-bold">
              Active meter
              <p
                className={`${inputClass} mt-1.5 flex items-center tabular-nums`}
              >
                {draft.timeSignature.numerator}/
                {draft.timeSignature.denominator}
              </p>
            </div>
          </div>

          <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {draft.steps.map((step, index) => {
              const label = labels[index] ?? String(index + 1);
              return (
                <li
                  className="border-border bg-surface-elevated rounded-xl border p-3"
                  key={`${draft.subdivision}-${index}`}
                >
                  <p className="text-accent mb-2 text-sm font-black tabular-nums">
                    {label}
                  </p>
                  <label className="text-muted-strong text-xs font-bold">
                    Action
                    <select
                      aria-label={`Action for position ${index + 1}, ${label}`}
                      className={`${inputClass} mt-1.5`}
                      name={`strum-action-${index}`}
                      onChange={(event) => {
                        const action = event.target.value as StrumAction;
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.map((candidate, stepIndex) =>
                            stepIndex === index
                              ? { ...candidate, action }
                              : candidate,
                          ),
                        }));
                      }}
                      value={step.action}
                    >
                      {actions.map((action) => (
                        <option key={action} value={action}>
                          {strumActionDetails[action].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-muted-strong mt-2 flex min-h-11 items-center gap-2 text-xs font-bold">
                    <input
                      aria-label={`Accent position ${index + 1}, ${label}`}
                      checked={step.accent === true}
                      className="accent-accent size-5"
                      name={`strum-accent-${index}`}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.map((candidate, stepIndex) =>
                            stepIndex === index
                              ? {
                                  ...candidate,
                                  accent: event.target.checked || undefined,
                                }
                              : candidate,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    Accent
                  </label>
                </li>
              );
            })}
          </ol>

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
              {isSaving ? "Saving…" : "Save strumming pattern"}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
