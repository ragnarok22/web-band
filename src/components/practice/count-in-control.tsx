"use client";

import { Clock3 } from "lucide-react";

import type { CountInMeasures } from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";

interface CountInControlProps {
  disabled: boolean;
  measures: CountInMeasures;
  onChange: (measures: CountInMeasures) => void;
  timeSignature: TimeSignature;
}

const choices: Array<{ label: string; value: CountInMeasures }> = [
  { label: "Off", value: 0 },
  { label: "1 bar", value: 1 },
  { label: "2 bars", value: 2 },
  { label: "4 bars", value: 4 },
];

export function CountInControl({
  disabled,
  measures,
  onChange,
  timeSignature,
}: CountInControlProps) {
  return (
    <fieldset className="border-border bg-surface rounded-2xl border p-4 sm:p-5">
      <legend className="sr-only">Count-in length</legend>
      <div className="mb-4 flex items-start gap-3">
        <span className="bg-secondary-accent/10 text-secondary-accent flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Clock3 aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-foreground font-bold">Count-in</p>
          <p className="text-muted mt-1 text-xs leading-5">
            {measures === 0
              ? "Start the groove immediately."
              : `${measures * timeSignature.numerator} synthesized clicks in ${timeSignature.numerator}/${timeSignature.denominator}.`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {choices.map((choice) => (
          <label key={choice.value}>
            <input
              checked={measures === choice.value}
              className="peer sr-only"
              disabled={disabled}
              name="count-in"
              onChange={() => onChange(choice.value)}
              type="radio"
              value={choice.value}
            />
            <span className="border-border text-muted-strong peer-checked:border-secondary-accent/60 peer-checked:bg-secondary-accent/10 peer-checked:text-secondary-accent peer-focus-visible:outline-accent flex min-h-11 cursor-pointer items-center justify-center rounded-lg border text-xs font-extrabold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-45">
              {choice.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
