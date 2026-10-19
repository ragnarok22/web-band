"use client";

import { Clock3 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NativeSelect } from "@/components/ui/native-select";

import type { CountInMeasures } from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";

interface CountInControlProps {
  compact?: boolean;
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
  compact = false,
  disabled,
  measures,
  onChange,
  timeSignature,
}: CountInControlProps) {
  if (compact) {
    return (
      <NativeSelect
        aria-label="Count-in length"
        className="w-auto"
        disabled={disabled}
        value={String(measures)}
        onChange={(event) =>
          onChange(Number(event.target.value) as CountInMeasures)
        }
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            Count-in: {choice.label}
          </option>
        ))}
      </NativeSelect>
    );
  }
  return (
    <fieldset className="border-border bg-surface rounded-2xl border p-4 sm:p-5">
      <legend className="sr-only">Count-in length</legend>
      <div className="mb-4 flex items-start gap-3">
        <span className="bg-secondary-accent/10 text-secondary-accent flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Clock3 aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-foreground font-bold">Count-in</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {measures === 0
              ? "Start the groove immediately."
              : `${measures * timeSignature.numerator} synthesized clicks in ${timeSignature.numerator}/${timeSignature.denominator}.`}
          </p>
        </div>
      </div>
      <RadioGroup
        aria-label="Count-in length"
        className="grid grid-cols-4 gap-1.5"
        value={String(measures)}
        disabled={disabled}
        onValueChange={(value) => onChange(Number(value) as CountInMeasures)}
      >
        {choices.map((choice) => (
          <label
            key={choice.value}
            className="border-border text-muted-strong has-data-checked:border-primary/60 has-data-checked:bg-primary/10 has-data-checked:text-primary flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg border px-1 text-xs font-extrabold has-data-disabled:opacity-45"
          >
            <RadioGroupItem
              aria-label={choice.label}
              value={String(choice.value)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
