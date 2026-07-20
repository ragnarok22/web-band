"use client";

import { Hand, RotateCcw } from "lucide-react";

import type { BpmAdjustmentStep } from "@/hooks/use-practice-shortcuts";
import { clampBpm, MAX_BPM, MIN_BPM } from "@/lib/musical-time";

interface BpmControlsProps {
  adjustmentStep?: BpmAdjustmentStep;
  bpm: number;
  defaultBpm: number;
  disabled?: boolean;
  onChange: (bpm: number) => void;
  onCommit?: (bpm: number) => void;
  onTap: () => void;
}

export function BpmControls({
  adjustmentStep = 1,
  bpm,
  defaultBpm,
  disabled = false,
  onChange,
  onCommit,
  onTap,
}: BpmControlsProps) {
  const alternateStep = adjustmentStep === 1 ? 5 : 1;
  const adjustments = [
    -adjustmentStep,
    adjustmentStep,
    -alternateStep,
    alternateStep,
  ];

  function commitDraft(input: HTMLInputElement): void {
    const parsed = Number(input.value);
    const nextBpm = clampBpm(parsed, bpm);
    input.value = String(nextBpm);
    onChange(nextBpm);
    onCommit?.(nextBpm);
  }

  function changeAndCommit(nextBpm: number): void {
    const clampedBpm = clampBpm(nextBpm, bpm);
    onChange(clampedBpm);
    onCommit?.(clampedBpm);
  }

  return (
    <section
      aria-labelledby="tempo-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-muted text-xs font-bold tracking-[0.18em] uppercase">
            Tempo
          </p>
          <h2
            className="text-foreground mt-1 text-lg font-bold"
            id="tempo-heading"
          >
            Set your pace
          </h2>
        </div>
        <button
          aria-label={`Reset tempo to ${defaultBpm} BPM`}
          className="border-border text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors"
          disabled={disabled}
          onClick={() => changeAndCommit(defaultBpm)}
          title="Reset to pattern default"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mb-5 flex items-end justify-center gap-2">
        <input
          aria-label="Current BPM"
          className="border-border text-foreground focus:border-accent w-28 border-b bg-transparent text-center text-6xl leading-none font-black tracking-[-0.06em] tabular-nums focus:outline-none"
          defaultValue={bpm}
          disabled={disabled}
          inputMode="numeric"
          key={bpm}
          max={MAX_BPM}
          min={MIN_BPM}
          onBlur={(event) => commitDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          type="number"
        />
        <span className="text-muted pb-1 text-sm font-extrabold tracking-[0.16em] uppercase">
          BPM
        </span>
      </div>

      <input
        aria-label="Tempo"
        aria-valuemax={MAX_BPM}
        aria-valuemin={MIN_BPM}
        aria-valuenow={bpm}
        aria-valuetext={`${bpm} BPM`}
        className="tempo-range mb-5 w-full"
        disabled={disabled}
        max={MAX_BPM}
        min={MIN_BPM}
        onChange={(event) => onChange(Number(event.target.value))}
        onBlur={(event) => onCommit?.(Number(event.currentTarget.value))}
        onKeyUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        onPointerUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        step={1}
        type="range"
        value={bpm}
      />

      <div
        aria-label="BPM adjustments"
        className="grid grid-cols-4 gap-2"
        role="group"
      >
        {adjustments.map((adjustment) => {
          const isDefault = Math.abs(adjustment) === adjustmentStep;

          return (
            <button
              aria-label={`${adjustment > 0 ? "Increase" : "Decrease"} BPM by ${Math.abs(adjustment)}`}
              className={`hover:bg-surface-hover hover:text-foreground min-h-11 rounded-lg border text-sm font-extrabold tabular-nums transition-colors active:translate-y-px ${
                isDefault
                  ? "border-accent/45 bg-accent/10 text-accent hover:border-accent/65"
                  : "border-border bg-surface-elevated text-muted-strong hover:border-border-strong"
              }`}
              data-default-adjustment={isDefault}
              disabled={disabled}
              key={adjustment}
              onClick={() => changeAndCommit(bpm + adjustment)}
              title={isDefault ? "Default BPM adjustment" : undefined}
              type="button"
            >
              {adjustment > 0 ? `+${adjustment}` : adjustment}
            </button>
          );
        })}
      </div>
      <button
        className="border-accent/30 bg-accent/8 text-accent hover:bg-accent/15 mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-extrabold transition-colors"
        disabled={disabled}
        onClick={onTap}
        type="button"
      >
        <Hand aria-hidden="true" className="size-4" />
        Tap tempo{" "}
        <kbd className="border-accent/25 rounded border px-1.5 py-0.5 text-[0.65rem]">
          T
        </kbd>
      </button>
    </section>
  );
}
