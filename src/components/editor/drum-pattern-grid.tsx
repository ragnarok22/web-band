"use client";

import { Clipboard, ClipboardPaste, SlidersHorizontal, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { HitPropertiesDialog } from "@/components/editor/hit-properties-dialog";
import {
  clearPatternRow,
  copyPatternMeasure,
  cyclePatternCell,
  editorInstruments,
  pastePatternMeasure,
  updateAdvancedHit,
  type MeasureClipboard,
} from "@/lib/drum-pattern-editor";
import {
  getBeatLabels,
  getPatternStepCount,
  getStepsPerBar,
} from "@/lib/musical-time";
import type { CustomDrumPattern } from "@/types/persistence";
import type { DrumHit, DrumInstrument } from "@/types/pattern";

interface DrumPatternGridProps {
  activeStep: number | null;
  disabled?: boolean;
  onChange: (pattern: CustomDrumPattern) => void;
  pattern: CustomDrumPattern;
}

interface CellAddress {
  instrument: DrumInstrument;
  step: number;
}

interface GridInteractionState {
  advancedCell: CellAddress | null;
  focusedCell: CellAddress;
  selected: CellAddress | null;
  structureKey: string;
  targetMeasure: number;
}

const instrumentLabels: Record<DrumInstrument, string> = {
  clap: "Clap",
  closedHat: "Closed hat",
  crash: "Crash",
  highTom: "High tom",
  kick: "Kick",
  lowTom: "Low tom",
  midTom: "Mid tom",
  openHat: "Open hat",
  ride: "Ride",
  rim: "Rim",
  snare: "Snare",
};

export function DrumPatternGrid({
  activeStep,
  disabled = false,
  onChange,
  pattern,
}: DrumPatternGridProps) {
  const stepsPerBar = getStepsPerBar(
    pattern.timeSignature,
    pattern.subdivision,
  );
  const stepsPerBeat = pattern.subdivision / pattern.timeSignature.denominator;
  const stepCount = getPatternStepCount(pattern);
  const structureKey = `${pattern.bars}:${stepCount}`;
  const [interactionState, setInteractionState] =
    useState<GridInteractionState>(() => ({
      advancedCell: null,
      focusedCell: { instrument: editorInstruments[0], step: 0 },
      selected: null,
      structureKey,
      targetMeasure: 0,
    }));
  const [clipboard, setClipboard] = useState<MeasureClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const currentInteractionState =
    interactionState.structureKey === structureKey
      ? interactionState
      : {
          advancedCell:
            interactionState.advancedCell &&
            interactionState.advancedCell.step < stepCount
              ? interactionState.advancedCell
              : null,
          focusedCell: {
            ...interactionState.focusedCell,
            step: Math.min(interactionState.focusedCell.step, stepCount - 1),
          },
          selected:
            interactionState.selected &&
            interactionState.selected.step < stepCount
              ? interactionState.selected
              : null,
          structureKey,
          targetMeasure: Math.min(
            interactionState.targetMeasure,
            pattern.bars - 1,
          ),
        };
  if (currentInteractionState !== interactionState) {
    setInteractionState(currentInteractionState);
  }
  const { advancedCell, focusedCell, selected, targetMeasure } =
    currentInteractionState;
  const beatLabels = getBeatLabels(pattern);
  const hitsByCell = new Map(
    pattern.hits.map((hit) => [`${hit.instrument}:${hit.step}`, hit]),
  );
  const safeTargetMeasure = Math.min(targetMeasure, pattern.bars - 1);

  function updateInteractionState(
    changes: Partial<Omit<GridInteractionState, "structureKey">>,
  ): void {
    setInteractionState({
      ...currentInteractionState,
      ...changes,
      structureKey,
    });
  }

  function selectAndCycle(instrument: DrumInstrument, step: number): void {
    updateInteractionState({ selected: { instrument, step } });
    onChange(cyclePatternCell(pattern, instrument, step));
  }

  function openAdvanced(instrument: DrumInstrument, step: number): void {
    const address = { instrument, step };
    updateInteractionState({ advancedCell: address, selected: address });
  }

  function copyMeasure(): void {
    setClipboard(copyPatternMeasure(pattern, safeTargetMeasure));
    setAnnouncement(`Copied measure ${safeTargetMeasure + 1}.`);
  }

  function pasteMeasure(): void {
    if (!clipboard) return;
    onChange(pastePatternMeasure(pattern, safeTargetMeasure, clipboard));
    setAnnouncement(
      `Pasted measure ${safeTargetMeasure + 1}, replacing its existing hits.`,
    );
  }

  function moveFocus(
    event: KeyboardEvent<HTMLButtonElement>,
    instrument: DrumInstrument,
    step: number,
  ): void {
    const address = getKeyboardDestination(
      event.key,
      instrument,
      step,
      stepCount,
    );
    if (!address) return;
    event.preventDefault();
    updateInteractionState({ focusedCell: address });
    document.getElementById(cellId(address))?.focus();
  }

  return (
    <section
      aria-labelledby="pattern-grid-heading"
      className="border-border bg-surface overflow-hidden rounded-2xl border"
    >
      <GridToolbar
        bars={pattern.bars}
        canEditSelected={Boolean(selected)}
        canPaste={Boolean(clipboard)}
        disabled={disabled}
        onCopy={copyMeasure}
        onEditSelected={() => {
          if (selected) openAdvanced(selected.instrument, selected.step);
        }}
        onPaste={pasteMeasure}
        onTargetMeasureChange={(targetMeasure) =>
          updateInteractionState({ targetMeasure })
        }
        targetMeasure={safeTargetMeasure}
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="w-full overflow-x-auto overflow-y-visible overscroll-x-contain">
        <div
          aria-colcount={stepCount + 1}
          aria-label="Drum pattern steps"
          aria-rowcount={editorInstruments.length + 1}
          className="min-w-max pb-2"
          role="grid"
        >
          <div
            aria-rowindex={1}
            className="border-border bg-background/80 sticky top-0 z-20 flex border-b"
            role="row"
          >
            <div
              aria-colindex={1}
              className="border-border bg-background sticky left-0 z-30 flex w-36 shrink-0 items-center border-r px-3 text-[0.62rem] font-extrabold tracking-wider uppercase sm:w-40"
              role="columnheader"
            >
              Instrument
            </div>
            {Array.from({ length: stepCount }, (_, step) => {
              const measure = Math.floor(step / stepsPerBar);
              const stepInBar = step % stepsPerBar;
              return (
                <div
                  aria-colindex={step + 2}
                  className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center border-r text-[0.62rem] font-bold tabular-nums ${boundaryClass(step, stepsPerBar, stepsPerBeat)}`}
                  key={step}
                  role="columnheader"
                >
                  {stepInBar === 0 ? (
                    <span className="text-accent">M{measure + 1}</span>
                  ) : null}
                  <span className="text-muted">
                    {beatLabels[stepInBar] || "."}
                  </span>
                </div>
              );
            })}
          </div>

          {editorInstruments.map((instrument, instrumentIndex) => (
            <div
              aria-rowindex={instrumentIndex + 2}
              className="flex"
              key={instrument}
              role="row"
            >
              <div
                aria-colindex={1}
                className="border-border bg-surface sticky left-0 z-10 flex w-36 shrink-0 items-center justify-between border-r border-b pl-3 sm:w-40"
                role="rowheader"
              >
                <span className="truncate pr-1 text-xs font-extrabold sm:text-sm">
                  {instrumentLabels[instrument]}
                </span>
                <button
                  aria-label={`Clear ${instrumentLabels[instrument]} row`}
                  className="text-muted hover:bg-danger/10 hover:text-danger flex size-11 shrink-0 items-center justify-center"
                  disabled={disabled}
                  onClick={() => {
                    onChange(clearPatternRow(pattern, instrument));
                    setAnnouncement(
                      `Cleared ${instrumentLabels[instrument]} row.`,
                    );
                  }}
                  title={`Clear ${instrumentLabels[instrument]} row`}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              {Array.from({ length: stepCount }, (_, step) => {
                const hit = hitsByCell.get(`${instrument}:${step}`);
                const isSelected =
                  selected?.instrument === instrument && selected.step === step;
                const isFocused =
                  focusedCell.instrument === instrument &&
                  focusedCell.step === step;
                return (
                  <div
                    aria-colindex={step + 2}
                    aria-selected={isSelected}
                    className="size-11 shrink-0"
                    key={step}
                    role="gridcell"
                  >
                    <button
                      aria-label={cellLabel(
                        instrumentLabels[instrument],
                        step,
                        stepsPerBar,
                        beatLabels[step % stepsPerBar] || ".",
                        hit,
                        activeStep === step,
                      )}
                      aria-pressed={Boolean(hit)}
                      className={`group flex size-full items-center justify-center border-r border-b transition-colors ${boundaryClass(step, stepsPerBar, stepsPerBeat)} ${
                        activeStep === step
                          ? "bg-accent/20"
                          : "hover:bg-surface-hover"
                      } ${isSelected ? "ring-accent ring-2 ring-inset" : ""}`}
                      disabled={disabled}
                      id={cellId({ instrument, step })}
                      onClick={() => selectAndCycle(instrument, step)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openAdvanced(instrument, step);
                      }}
                      onFocus={() =>
                        updateInteractionState({
                          focusedCell: { instrument, step },
                        })
                      }
                      onKeyDown={(event) => moveFocus(event, instrument, step)}
                      tabIndex={!disabled && isFocused ? 0 : -1}
                      type="button"
                    >
                      {hit ? (
                        <HitMark hit={hit} />
                      ) : (
                        <span aria-hidden="true">.</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {advancedCell ? (
        <HitPropertiesDialog
          hit={hitsByCell.get(
            `${advancedCell.instrument}:${advancedCell.step}`,
          )}
          instrument={advancedCell.instrument}
          onClose={() => updateInteractionState({ advancedCell: null })}
          onSave={(changes) => {
            if (advancedCell.step >= stepCount) return;
            onChange(
              updateAdvancedHit(
                pattern,
                advancedCell.instrument,
                advancedCell.step,
                changes,
              ),
            );
            setAnnouncement("Advanced hit properties updated.");
          }}
          step={advancedCell.step}
        />
      ) : null}
    </section>
  );
}

function GridToolbar({
  bars,
  canEditSelected,
  canPaste,
  disabled,
  onCopy,
  onEditSelected,
  onPaste,
  onTargetMeasureChange,
  targetMeasure,
}: {
  bars: number;
  canEditSelected: boolean;
  canPaste: boolean;
  disabled: boolean;
  onCopy: () => void;
  onEditSelected: () => void;
  onPaste: () => void;
  onTargetMeasureChange: (measure: number) => void;
  targetMeasure: number;
}) {
  return (
    <header className="border-border flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
          Step sequencer
        </p>
        <h2 className="mt-1 text-xl font-black" id="pattern-grid-heading">
          Build the pocket
        </h2>
        <p className="text-muted mt-1 text-xs">
          Tap a cell to cycle 70, 85, and 100 percent velocity.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-muted text-[0.62rem] font-extrabold tracking-wider uppercase">
          Target measure
          <select
            aria-label="Target measure"
            className="border-border bg-surface-elevated text-foreground mt-1 block min-h-11 rounded-xl border px-3 text-sm font-bold"
            disabled={disabled}
            name="target-measure"
            onChange={(event) =>
              onTargetMeasureChange(Number(event.target.value))
            }
            value={targetMeasure}
          >
            {Array.from({ length: bars }, (_, index) => (
              <option key={index} value={index}>
                Measure {index + 1}
              </option>
            ))}
          </select>
        </label>
        <GridAction label="Copy measure" onClick={onCopy} disabled={disabled}>
          <Clipboard aria-hidden="true" className="size-4" />
        </GridAction>
        <GridAction
          label="Paste measure"
          onClick={onPaste}
          disabled={disabled || !canPaste}
        >
          <ClipboardPaste aria-hidden="true" className="size-4" />
        </GridAction>
        <GridAction
          label="Edit selected hit properties"
          onClick={onEditSelected}
          disabled={disabled || !canEditSelected}
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
        </GridAction>
      </div>
    </header>
  );
}

function boundaryClass(
  step: number,
  stepsPerBar: number,
  stepsPerBeat: number,
): string {
  if (step % stepsPerBar === 0) return "border-l-4 border-l-accent/50";
  if (step % stepsPerBeat === 0) return "border-l-2 border-l-border-strong";
  return "border-l border-l-border";
}

function cellLabel(
  label: string,
  step: number,
  stepsPerBar: number,
  beatLabel: string,
  hit: DrumHit | undefined,
  isPlayhead: boolean,
): string {
  const measure = Math.floor(step / stepsPerBar) + 1;
  const column = (step % stepsPerBar) + 1;
  const position = `${label}, measure ${measure}, column ${column}, beat ${beatLabel}`;
  const playhead = isPlayhead ? "playhead active" : "playhead inactive";
  if (!hit) return `${position}, empty, ${playhead}`;
  const details = [
    `${Math.round(hit.velocity * 100)} percent velocity`,
    `${Math.round((hit.probability ?? 1) * 100)} percent probability`,
  ];
  if (hit.flam) details.push("flam");
  return `${position}, ${details.join(", ")}, ${playhead}`;
}

function cellId({ instrument, step }: CellAddress): string {
  return `drum-grid-${instrument}-${step}`;
}

function getKeyboardDestination(
  key: string,
  instrument: DrumInstrument,
  step: number,
  stepCount: number,
): CellAddress | null {
  const instrumentIndex = editorInstruments.indexOf(instrument);
  switch (key) {
    case "ArrowLeft":
      return { instrument, step: Math.max(0, step - 1) };
    case "ArrowRight":
      return { instrument, step: Math.min(stepCount - 1, step + 1) };
    case "ArrowUp":
      return {
        instrument: editorInstruments[Math.max(0, instrumentIndex - 1)]!,
        step,
      };
    case "ArrowDown":
      return {
        instrument:
          editorInstruments[
            Math.min(editorInstruments.length - 1, instrumentIndex + 1)
          ]!,
        step,
      };
    case "Home":
      return { instrument, step: 0 };
    case "End":
      return { instrument, step: stepCount - 1 };
    default:
      return null;
  }
}

function HitMark({ hit }: { hit: DrumHit }) {
  return (
    <span
      aria-hidden="true"
      className={`bg-accent text-accent-ink flex size-8 items-center justify-center text-[0.58rem] font-black tabular-nums shadow-[0_0_12px_rgba(231,169,75,0.18)] ${
        hit.flam ? "rotate-45 rounded-md" : "rounded-full"
      }`}
      style={{ opacity: 0.35 + hit.velocity * 0.65 }}
    >
      <span className={hit.flam ? "-rotate-45" : ""}>
        {Math.round(hit.velocity * 100)}
      </span>
    </span>
  );
}

function GridAction({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:text-foreground flex size-11 items-center justify-center rounded-xl border disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
