"use client";

import { Hand, RotateCcw } from "lucide-react";

import { clampBpm, MAX_BPM, MIN_BPM } from "@/lib/musical-time";

interface BpmControlsProps {
  bpm: number;
  defaultBpm: number;
  onChange: (bpm: number) => void;
  onTap: () => void;
}

const adjustments = [-5, -1, 1, 5] as const;

export function BpmControls({
  bpm,
  defaultBpm,
  onChange,
  onTap,
}: BpmControlsProps) {
  function commitDraft(input: HTMLInputElement): void {
    const parsed = Number(input.value);
    const nextBpm = clampBpm(parsed, bpm);
    input.value = String(nextBpm);
    onChange(nextBpm);
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
          onClick={() => onChange(defaultBpm)}
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
        className="tempo-range mb-5 w-full"
        max={MAX_BPM}
        min={MIN_BPM}
        onChange={(event) => onChange(Number(event.target.value))}
        step={1}
        type="range"
        value={bpm}
      />

      <div className="grid grid-cols-4 gap-2">
        {adjustments.map((adjustment) => (
          <button
            aria-label={`${adjustment > 0 ? "Increase" : "Decrease"} BPM by ${Math.abs(adjustment)}`}
            className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground min-h-11 rounded-lg border text-sm font-extrabold tabular-nums transition-colors active:translate-y-px"
            key={adjustment}
            onClick={() => onChange(bpm + adjustment)}
            type="button"
          >
            {adjustment > 0 ? `+${adjustment}` : adjustment}
          </button>
        ))}
      </div>
      <button
        className="border-accent/30 bg-accent/8 text-accent hover:bg-accent/15 mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-extrabold transition-colors"
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
