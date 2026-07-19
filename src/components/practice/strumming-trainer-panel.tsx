"use client";

import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";

import { StrummingPatternDeleteConfirmation } from "@/components/practice/strumming-pattern-delete-confirmation";
import { StrummingPatternEditorDialog } from "@/components/practice/strumming-pattern-editor-dialog";
import { StrummingSequence } from "@/components/practice/strumming-sequence";
import {
  builtInStrummingPatterns,
  quarterDownstrokesPattern,
} from "@/data/strumming-patterns";
import { isStrummingPatternMeterCompatible } from "@/lib/guided-practice";
import {
  useStrummingPatternStore,
  type StrummingPatternInput,
} from "@/stores/strumming-pattern-store";
import type { TimeSignature } from "@/types/pattern";
import type { CustomStrummingPattern } from "@/types/persistence";
import type { StrummingPattern } from "@/types/practice";

interface StrummingTrainerPanelProps {
  disabled?: boolean;
  onChange: (pattern: StrummingPattern) => void;
  pattern: StrummingPattern;
  timeSignature: TimeSignature;
}

type EditorTarget = CustomStrummingPattern | "new" | null;

const buttonClass =
  "border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-45";

export function StrummingTrainerPanel({
  disabled = false,
  onChange,
  pattern,
  timeSignature,
}: StrummingTrainerPanelProps) {
  const customPatterns = useStrummingPatternStore(
    (state) => state.customPatterns,
  );
  const isHydrated = useStrummingPatternStore((state) => state.isHydrated);
  const create = useStrummingPatternStore((state) => state.create);
  const deletePattern = useStrummingPatternStore((state) => state.delete);
  const update = useStrummingPatternStore((state) => state.update);
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const editorTriggerRef = useRef<HTMLButtonElement>(null);
  const patternSelectRef = useRef<HTMLSelectElement>(null);
  const compatibleBuiltIns = builtInStrummingPatterns.filter((candidate) =>
    isStrummingPatternMeterCompatible(candidate, timeSignature),
  );
  const compatibleCustom = customPatterns.filter((candidate) =>
    isStrummingPatternMeterCompatible(candidate, timeSignature),
  );
  const compatiblePatterns = [...compatibleBuiltIns, ...compatibleCustom];
  const selectedCustom = pattern.isBuiltIn
    ? undefined
    : customPatterns.find(({ id }) => id === pattern.id);
  const availableSelected = pattern.isBuiltIn
    ? builtInStrummingPatterns.find(({ id }) => id === pattern.id)
    : selectedCustom;
  const isCompatible = availableSelected
    ? isStrummingPatternMeterCompatible(availableSelected, timeSignature)
    : false;
  const controlsDisabled = disabled || !isHydrated;

  function selectPattern(nextPattern: StrummingPattern): void {
    setConfirmingDelete(false);
    onChange(structuredClone(nextPattern));
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
          : "Strumming pattern change could not be saved.",
      );
    }
  }

  async function saveEditor(input: StrummingPatternInput): Promise<void> {
    const saved = await (editorTarget && editorTarget !== "new"
      ? update(editorTarget.id, input)
      : create(input));
    selectPattern(saved);
  }

  async function removeSelectedPattern(): Promise<void> {
    if (!selectedCustom) return;
    const deleted = await run(async () => {
      await deletePattern(selectedCustom.id);
      return true;
    });
    if (!deleted) return;
    const fallback =
      compatiblePatterns.find(({ id }) => id !== selectedCustom.id) ??
      quarterDownstrokesPattern;
    selectPattern(fallback);
    window.requestAnimationFrame(() => patternSelectRef.current?.focus());
  }

  const warningId = !availableSelected
    ? "strumming-pattern-unavailable"
    : !isCompatible
      ? "strumming-meter-warning"
      : undefined;

  return (
    <section
      aria-labelledby="strumming-trainer-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-4">
        <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
          Right-hand rhythm
        </p>
        <h3
          className="text-foreground mt-1 text-lg font-black"
          id="strumming-trainer-heading"
        >
          Strumming trainer
        </h3>
      </div>

      <label className="text-muted-strong text-xs font-bold">
        Pattern for {timeSignature.numerator}/{timeSignature.denominator}
        <select
          aria-describedby={warningId}
          aria-invalid={!availableSelected || !isCompatible}
          className="border-border bg-surface-elevated text-foreground focus:border-accent mt-1.5 min-h-11 w-full rounded-lg border px-3 text-sm font-bold outline-none disabled:opacity-45"
          disabled={controlsDisabled || compatiblePatterns.length === 0}
          onChange={(event) => {
            const selected = compatiblePatterns.find(
              ({ id }) => id === event.target.value,
            );
            if (selected) selectPattern(selected);
          }}
          ref={patternSelectRef}
          value={availableSelected && isCompatible ? pattern.id : ""}
        >
          {!availableSelected ? (
            <option disabled value="">
              Unavailable custom pattern
            </option>
          ) : !isCompatible ? (
            <option disabled value="">
              Choose a compatible pattern
            </option>
          ) : null}
          {compatibleBuiltIns.length > 0 ? (
            <optgroup label="Built-in patterns">
              {compatibleBuiltIns.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {compatibleCustom.length > 0 ? (
            <optgroup label="Custom patterns">
              {compatibleCustom.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={buttonClass}
          disabled={controlsDisabled}
          onClick={(event) => openEditor("new", event)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          New
        </button>
        {selectedCustom ? (
          <>
            <button
              className={buttonClass}
              disabled={controlsDisabled}
              onClick={(event) => openEditor(selectedCustom, event)}
              type="button"
            >
              <Pencil aria-hidden="true" className="size-4" />
              Edit
            </button>
            <button
              className={`${buttonClass} border-danger/30 text-danger`}
              disabled={controlsDisabled}
              onClick={() => setConfirmingDelete(true)}
              ref={deleteTriggerRef}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
          </>
        ) : null}
      </div>

      {confirmingDelete && selectedCustom ? (
        <StrummingPatternDeleteConfirmation
          name={selectedCustom.name}
          onCancel={() => {
            setConfirmingDelete(false);
            deleteTriggerRef.current?.focus();
          }}
          onConfirm={() => void removeSelectedPattern()}
        />
      ) : null}

      {!availableSelected ? (
        <p
          className="text-danger mt-3 text-sm font-bold"
          id="strumming-pattern-unavailable"
          role="alert"
        >
          The selected custom strumming pattern is no longer available. Choose
          another pattern or create a new one.
        </p>
      ) : !isCompatible ? (
        <div
          className="border-danger/30 bg-danger/8 text-danger mt-3 flex gap-3 rounded-xl border p-3 text-sm leading-5 font-bold"
          id="strumming-meter-warning"
          role="alert"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            {pattern.name} is in {pattern.timeSignature.numerator}/
            {pattern.timeSignature.denominator} and cannot follow this{" "}
            {timeSignature.numerator}/{timeSignature.denominator} drum groove.
            Choose a compatible pattern.
          </p>
        </div>
      ) : null}

      {availableSelected ? (
        <>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-extrabold">
                {availableSelected.name}
              </p>
              <p className="text-muted mt-1 text-xs">
                {availableSelected.subdivision}th-note grid - every action shown
              </p>
            </div>
            <span className="border-border bg-background text-muted-strong rounded-lg border px-2.5 py-1.5 text-xs font-black tabular-nums">
              {availableSelected.steps.length} steps
            </span>
          </div>
          <StrummingSequence className="mt-3" pattern={availableSelected} />
        </>
      ) : null}

      {errorMessage ? (
        <p className="text-danger mt-3 text-sm font-bold" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {editorTarget ? (
        <StrummingPatternEditorDialog
          disabled={disabled}
          key={editorTarget === "new" ? "new" : editorTarget.id}
          onClose={closeEditor}
          onSave={saveEditor}
          pattern={editorTarget === "new" ? undefined : editorTarget}
          timeSignature={timeSignature}
        />
      ) : null}
    </section>
  );
}
