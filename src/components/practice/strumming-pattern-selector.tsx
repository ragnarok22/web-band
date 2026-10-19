"use client";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

import { AlertTriangle, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type MouseEvent, type Ref } from "react";

import { StrummingPatternDeleteConfirmation } from "@/components/practice/strumming-pattern-delete-confirmation";
import { StrummingPatternEditorDialog } from "@/components/practice/strumming-pattern-editor-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface StrummingPatternSelectorProps {
  disabled?: boolean;
  onChange: (pattern: StrummingPattern) => void;
  pattern: StrummingPattern;
  timeSignature: TimeSignature;
}

type EditorTarget = CustomStrummingPattern | "new" | null;

const buttonClass =
  "border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-45";

export function StrummingPatternSelector({
  disabled = false,
  onChange,
  pattern,
  timeSignature,
}: StrummingPatternSelectorProps) {
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

  return (
    <section
      aria-label="Strumming pattern"
      className="min-w-0 px-4 pt-4 pb-3 sm:px-6"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
          Strumming practice
        </h2>
        <span className="text-muted-foreground text-xs font-bold tabular-nums">
          {pattern.steps.length} steps
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <StrummingPatternSelect
            availableSelected={availableSelected}
            compatibleBuiltIns={compatibleBuiltIns}
            compatibleCustom={compatibleCustom}
            disabled={controlsDisabled}
            isCompatible={isCompatible}
            onSelect={(patternId) => {
              const selected = compatiblePatterns.find(
                ({ id }) => id === patternId,
              );
              if (selected) selectPattern(selected);
            }}
            pattern={pattern}
            selectRef={patternSelectRef}
            timeSignature={timeSignature}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className={buttonClass}
            disabled={controlsDisabled}
            onClick={(event) => openEditor("new", event)}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            New
          </Button>
          {selectedCustom ? (
            <>
              <Button
                variant="outline"
                className={buttonClass}
                disabled={controlsDisabled}
                onClick={(event) => openEditor(selectedCustom, event)}
                type="button"
              >
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" />}
                  aria-label="Pattern actions"
                  className="size-11"
                  disabled={controlsDisabled}
                  ref={deleteTriggerRef}
                >
                  <Ellipsis aria-hidden="true" className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="min-h-11"
                    onClick={() => setConfirmingDelete(true)}
                    variant="destructive"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Delete pattern
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
      </div>

      <p className="text-muted-foreground mt-2 text-xs">
        <span className="tabular-nums">
          {pattern.timeSignature.numerator}/{pattern.timeSignature.denominator}
        </span>
        {" · "}
        {pattern.subdivision === 8 ? "Eighth" : "Sixteenth"}-note grid
        {" · "}
        {pattern.isBuiltIn ? "Built-in" : "Custom"}
      </p>

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

      <StrummingSelectionWarning
        isAvailable={availableSelected !== undefined}
        isCompatible={isCompatible}
        pattern={pattern}
        timeSignature={timeSignature}
      />

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

function StrummingSelectionWarning({
  isAvailable,
  isCompatible,
  pattern,
  timeSignature,
}: Pick<StrummingPatternSelectorProps, "pattern" | "timeSignature"> & {
  isAvailable: boolean;
  isCompatible: boolean;
}) {
  if (!isAvailable) {
    return (
      <p
        className="text-danger mt-3 text-sm font-bold"
        id="strumming-pattern-unavailable"
        role="alert"
      >
        The selected custom strumming pattern is no longer available. Choose
        another pattern or create a new one.
      </p>
    );
  }
  if (isCompatible) return null;

  return (
    <div
      className="border-danger/30 bg-danger/8 text-danger mt-3 flex gap-3 rounded-xl border p-3 text-sm leading-5 font-bold"
      id="strumming-meter-warning"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        {pattern.name} is in {pattern.timeSignature.numerator}/
        {pattern.timeSignature.denominator} and cannot follow this{" "}
        {timeSignature.numerator}/{timeSignature.denominator} drum groove.
        Choose a compatible pattern.
      </p>
    </div>
  );
}

interface StrummingPatternSelectProps extends Pick<
  StrummingPatternSelectorProps,
  "pattern" | "timeSignature"
> {
  availableSelected: StrummingPattern | undefined;
  compatibleBuiltIns: StrummingPattern[];
  compatibleCustom: CustomStrummingPattern[];
  disabled: boolean;
  isCompatible: boolean;
  onSelect: (patternId: string) => void;
  selectRef: Ref<HTMLSelectElement>;
}

function StrummingPatternSelect({
  availableSelected,
  compatibleBuiltIns,
  compatibleCustom,
  disabled,
  isCompatible,
  onSelect,
  pattern,
  selectRef,
  timeSignature,
}: StrummingPatternSelectProps) {
  const warningId = !availableSelected
    ? "strumming-pattern-unavailable"
    : !isCompatible
      ? "strumming-meter-warning"
      : undefined;

  return (
    <label className="text-muted-strong text-xs font-bold">
      <span className="sr-only">
        Pattern for {timeSignature.numerator}/{timeSignature.denominator}
      </span>
      <NativeSelect
        aria-describedby={warningId}
        aria-invalid={!availableSelected || !isCompatible}
        className="[&_select]:text-base [&_select]:font-extrabold"
        disabled={
          disabled || compatibleBuiltIns.length + compatibleCustom.length === 0
        }
        onChange={(event) => onSelect(event.target.value)}
        ref={selectRef}
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
      </NativeSelect>
    </label>
  );
}
