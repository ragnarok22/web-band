"use client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { PracticeMode } from "@/types/practice";

interface PracticeModeSelectorProps {
  disabled: boolean;
  mode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}

const modes: Array<{
  description: string;
  label: string;
  value: PracticeMode;
}> = [
  {
    description: "Play the groove without added cues.",
    label: "Drums",
    value: "drums",
  },
  {
    description: "Build speed in measured steps.",
    label: "Tempo",
    value: "tempoTrainer",
  },
  {
    description: "Follow a timed chord progression.",
    label: "Chords",
    value: "chords",
  },
  {
    description: "Practice a complete strum pattern.",
    label: "Strumming",
    value: "strumming",
  },
];

export function PracticeModeSelector({
  disabled,
  mode,
  onChange,
}: PracticeModeSelectorProps) {
  return (
    <fieldset
      aria-describedby={disabled ? "practice-mode-disabled" : undefined}
      className="border-border bg-surface rounded-2xl border p-3 sm:p-4"
    >
      <legend className="sr-only">Practice mode</legend>
      <RadioGroup
        aria-label="Practice mode"
        className="grid grid-cols-2 gap-2"
        value={mode}
        disabled={disabled}
        onValueChange={(value) => onChange(value as PracticeMode)}
      >
        {modes.map((choice, index) => (
          <label
            className="border-border bg-surface-elevated text-muted-strong has-data-checked:border-primary/60 has-data-checked:bg-primary/10 has-data-checked:text-primary flex h-full min-h-16 w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 has-data-disabled:opacity-45"
            key={choice.value}
          >
            <RadioGroupItem aria-label={choice.label} value={choice.value} />
            <span className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="border-border bg-background flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-black tabular-nums"
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold">
                  {choice.label}
                </span>
                <span className="text-muted-foreground mt-0.5 hidden text-[0.68rem] leading-4 xl:block">
                  {choice.description}
                </span>
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
      {disabled ? (
        <p
          className="text-muted-foreground mt-2 text-xs"
          id="practice-mode-disabled"
        >
          Stop the current session to change practice mode.
        </p>
      ) : null}
    </fieldset>
  );
}
