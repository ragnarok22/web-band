"use client";

import { Clipboard, ClipboardPaste, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

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
  const [selected, setSelected] = useState<CellAddress | null>(null);
  const [advancedCell, setAdvancedCell] = useState<CellAddress | null>(null);
  const [clipboard, setClipboard] = useState<MeasureClipboard | null>(null);
  const [targetMeasure, setTargetMeasure] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const stepsPerBar = getStepsPerBar(
    pattern.timeSignature,
    pattern.subdivision,
  );
  const stepsPerBeat = pattern.subdivision / pattern.timeSignature.denominator;
  const stepCount = getPatternStepCount(pattern);
  const beatLabels = getBeatLabels(pattern);
  const hitsByCell = new Map(
    pattern.hits.map((hit) => [`${hit.instrument}:${hit.step}`, hit]),
  );

  function selectAndCycle(instrument: DrumInstrument, step: number): void {
    setSelected({ instrument, step });
    onChange(cyclePatternCell(pattern, instrument, step));
  }

  function openAdvanced(instrument: DrumInstrument, step: number): void {
    const address = { instrument, step };
    setSelected(address);
    setAdvancedCell(address);
  }

  function copyMeasure(): void {
    setClipboard(copyPatternMeasure(pattern, targetMeasure));
    setAnnouncement(`Copied measure ${targetMeasure + 1}.`);
  }

  function pasteMeasure(): void {
    if (!clipboard) return;
    onChange(pastePatternMeasure(pattern, targetMeasure, clipboard));
    setAnnouncement(
      `Pasted measure ${targetMeasure + 1}, replacing its existing hits.`,
    );
  }

  return (
    <section
      aria-labelledby="pattern-grid-heading"
      className="border-border bg-surface overflow-hidden rounded-2xl border"
    >
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
              onChange={(event) => setTargetMeasure(Number(event.target.value))}
              value={targetMeasure}
            >
              {Array.from({ length: pattern.bars }, (_, index) => (
                <option key={index} value={index}>
                  Measure {index + 1}
                </option>
              ))}
            </select>
          </label>
          <GridAction
            label="Copy measure"
            onClick={copyMeasure}
            disabled={disabled}
          >
            <Clipboard aria-hidden="true" className="size-4" />
          </GridAction>
          <GridAction
            label="Paste measure"
            onClick={pasteMeasure}
            disabled={disabled || !clipboard}
          >
            <ClipboardPaste aria-hidden="true" className="size-4" />
          </GridAction>
          <GridAction
            label="Edit selected hit properties"
            onClick={() => {
              if (selected) openAdvanced(selected.instrument, selected.step);
            }}
            disabled={disabled || !selected}
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
          </GridAction>
        </div>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div
        aria-label="Drum pattern steps"
        className="max-h-[70dvh] overflow-auto overscroll-contain"
        role="region"
        tabIndex={0}
      >
        <div className="min-w-max pb-2">
          <div className="border-border bg-background/80 sticky top-0 z-20 flex border-b">
            <div className="border-border bg-background sticky left-0 z-30 flex w-36 shrink-0 items-center border-r px-3 text-[0.62rem] font-extrabold tracking-wider uppercase sm:w-40">
              Instrument
            </div>
            {Array.from({ length: stepCount }, (_, step) => {
              const measure = Math.floor(step / stepsPerBar);
              const stepInBar = step % stepsPerBar;
              return (
                <div
                  className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center border-r text-[0.62rem] font-bold tabular-nums ${boundaryClass(step, stepsPerBar, stepsPerBeat)}`}
                  key={step}
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

          {editorInstruments.map((instrument) => (
            <div className="flex" key={instrument}>
              <div className="border-border bg-surface sticky left-0 z-10 flex w-36 shrink-0 items-center justify-between border-r border-b pl-3 sm:w-40">
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
                return (
                  <button
                    aria-label={cellLabel(
                      instrumentLabels[instrument],
                      step,
                      hit,
                    )}
                    aria-pressed={Boolean(hit)}
                    className={`group flex size-11 shrink-0 items-center justify-center border-r border-b transition-colors ${boundaryClass(step, stepsPerBar, stepsPerBeat)} ${
                      activeStep === step
                        ? "bg-accent/20"
                        : "hover:bg-surface-hover"
                    } ${isSelected ? "ring-accent ring-2 ring-inset" : ""}`}
                    disabled={disabled}
                    key={step}
                    onClick={() => selectAndCycle(instrument, step)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openAdvanced(instrument, step);
                    }}
                    type="button"
                  >
                    {hit ? (
                      <HitMark hit={hit} />
                    ) : (
                      <span aria-hidden="true">.</span>
                    )}
                  </button>
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
          onClose={() => setAdvancedCell(null)}
          onSave={(changes) => {
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

function boundaryClass(
  step: number,
  stepsPerBar: number,
  stepsPerBeat: number,
): string {
  if (step % stepsPerBar === 0) return "border-l-4 border-l-accent/50";
  if (step % stepsPerBeat === 0) return "border-l-2 border-l-border-strong";
  return "border-l border-l-border";
}

function cellLabel(label: string, step: number, hit?: DrumHit): string {
  if (!hit) return `${label}, step ${step + 1}, empty`;
  const details = [
    `${Math.round(hit.velocity * 100)} percent velocity`,
    `${Math.round((hit.probability ?? 1) * 100)} percent probability`,
  ];
  if (hit.flam) details.push("flam");
  return `${label}, step ${step + 1}, ${details.join(", ")}`;
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
