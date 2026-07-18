"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { AdvancedHitChanges } from "@/lib/drum-pattern-editor";
import type { DrumHit, DrumInstrument } from "@/types/pattern";

interface HitPropertiesDialogProps {
  hit?: DrumHit;
  instrument: DrumInstrument;
  onClose: () => void;
  onSave: (changes: AdvancedHitChanges) => void;
  step: number;
}

const rangeClass = "tempo-range w-full accent-accent";

export function HitPropertiesDialog({
  hit,
  instrument,
  onClose,
  onSave,
  step,
}: HitPropertiesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [velocity, setVelocity] = useState(hit?.velocity ?? 0.7);
  const [probability, setProbability] = useState(hit?.probability ?? 1);
  const [flam, setFlam] = useState(hit?.flam ?? false);
  const [timingOffset, setTimingOffset] = useState(hit?.timingOffset ?? 0);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave({ flam, probability, timingOffset, velocity });
    dialogRef.current?.close();
  }

  return (
    <dialog
      aria-labelledby="hit-properties-heading"
      className="border-border bg-surface text-foreground fixed inset-0 m-auto w-[min(92vw,30rem)] rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <form onSubmit={submit}>
        <header className="border-border flex items-start justify-between border-b p-4 sm:p-5">
          <div>
            <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
              Advanced hit
            </p>
            <h2 className="mt-1 text-xl font-black" id="hit-properties-heading">
              {formatInstrument(instrument)} - step {step + 1}
            </h2>
          </div>
          <button
            aria-label="Close hit properties"
            className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 items-center justify-center rounded-xl"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="grid gap-5 p-4 sm:p-5">
          <RangeField
            label="Velocity"
            max={1}
            min={0}
            onChange={setVelocity}
            step={0.05}
            value={velocity}
          />
          <RangeField
            label="Probability"
            max={1}
            min={0}
            onChange={setProbability}
            step={0.05}
            value={probability}
          />
          <RangeField
            label="Timing offset"
            max={0.1}
            min={-0.1}
            onChange={setTimingOffset}
            step={0.005}
            value={timingOffset}
          />
          <label className="border-border bg-surface-elevated flex min-h-12 items-center justify-between rounded-xl border px-3 text-sm font-extrabold">
            Flam
            <input
              checked={flam}
              className="size-5 accent-[var(--accent)]"
              onChange={(event) => setFlam(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
        <footer className="border-border flex justify-end gap-2 border-t p-4 sm:p-5">
          <button
            className="border-border text-muted-strong hover:bg-surface-hover min-h-11 rounded-xl border px-4 text-sm font-extrabold"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            Cancel
          </button>
          <button
            className="bg-accent text-accent-ink hover:bg-accent-strong min-h-11 rounded-xl px-5 text-sm font-extrabold"
            type="submit"
          >
            Apply hit
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function RangeField({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-extrabold">
      <span className="flex justify-between gap-4">
        {label}
        <output className="text-accent font-mono tabular-nums">
          {value.toFixed(label === "Timing offset" ? 3 : 2)}
        </output>
      </span>
      <input
        aria-label={label}
        className={rangeClass}
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function formatInstrument(instrument: DrumInstrument): string {
  return instrument
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
