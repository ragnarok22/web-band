"use client";

import { X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

import type { AdvancedHitChanges } from "@/lib/drum-pattern-editor";
import type { DrumHit, DrumInstrument } from "@/types/pattern";

interface HitPropertiesDialogProps {
  hit?: DrumHit;
  instrument: DrumInstrument;
  onClose: () => void;
  onSave: (changes: AdvancedHitChanges) => void;
  step: number;
}

export function HitPropertiesDialog({
  hit,
  instrument,
  onClose,
  onSave,
  step,
}: HitPropertiesDialogProps) {
  const [velocity, setVelocity] = useState(hit?.velocity ?? 0.7);
  const [probability, setProbability] = useState(hit?.probability ?? 1);
  const [flam, setFlam] = useState(hit?.flam ?? false);
  const [timingOffset, setTimingOffset] = useState(hit?.timingOffset ?? 0);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave({ flam, probability, timingOffset, velocity });
    onClose();
  }

  return (
    <Modal
      aria-labelledby="hit-properties-heading"
      className="p-0 sm:max-w-lg"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <header className="border-border flex items-start justify-between border-b p-4 sm:p-5">
          <div>
            <p className="text-primary text-xs font-extrabold tracking-[0.16em] uppercase">
              Advanced hit
            </p>
            <h2 className="mt-1 text-xl font-black" id="hit-properties-heading">
              {formatInstrument(instrument)} - step {step + 1}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close hit properties"
            className="size-11"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
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
            <Checkbox checked={flam} onCheckedChange={setFlam} />
          </label>
        </div>
        <footer className="border-border flex justify-end gap-2 border-t p-4 sm:p-5">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={onClose}
            type="button"
          >
            Cancel
          </Button>
          <Button className="min-h-11" type="submit">
            Apply hit
          </Button>
        </footer>
      </form>
    </Modal>
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
  const inputId = useId();

  return (
    <div className="grid gap-2 text-sm font-extrabold">
      <span className="flex justify-between gap-4">
        <label htmlFor={inputId}>{label}</label>
        <output
          className="text-primary font-mono tabular-nums"
          htmlFor={inputId}
        >
          {value.toFixed(label === "Timing offset" ? 3 : 2)}
        </output>
      </span>
      <Slider
        aria-label={label}
        id={inputId}
        max={max}
        min={min}
        onValueChange={(value) => onChange(Number(value))}
        step={step}
        value={value}
      />
    </div>
  );
}

function formatInstrument(instrument: DrumInstrument): string {
  return instrument
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
