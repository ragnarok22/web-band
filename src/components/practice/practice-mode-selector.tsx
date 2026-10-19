"use client";

import {
  ArrowDownUp,
  Drum,
  Gauge,
  Guitar,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { PracticeMode } from "@/types/practice";

interface PracticeModeSelectorProps {
  disabled: boolean;
  mode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}

const modes: Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  value: PracticeMode;
}> = [
  {
    description: "Play the groove without added cues.",
    icon: Drum,
    label: "Drums",
    value: "drums",
  },
  {
    description: "Practice a complete strum pattern.",
    icon: ArrowDownUp,
    label: "Strumming",
    value: "strumming",
  },
  {
    description: "Follow a timed chord progression.",
    icon: Guitar,
    label: "Chords",
    value: "chords",
  },
  {
    description: "Build speed in measured steps.",
    icon: Gauge,
    label: "Tempo",
    value: "tempoTrainer",
  },
];

export function PracticeModeSelector({
  disabled,
  mode,
  onChange,
}: PracticeModeSelectorProps) {
  const id = useId();

  return (
    <fieldset
      aria-describedby={disabled ? `${id}-disabled` : undefined}
      className="@container/practice-modes min-w-0"
    >
      <legend className="sr-only">Practice mode</legend>
      <RadioGroup
        aria-label="Practice mode"
        className="flex flex-wrap gap-2"
        value={mode}
        disabled={disabled}
        onValueChange={(value) => onChange(value as PracticeMode)}
      >
        {modes.map(({ description, icon: Icon, label, value }) => (
          <label
            className="group/mode border-border bg-surface text-muted-strong has-data-checked:border-primary/65 has-data-checked:bg-primary/10 has-data-checked:text-primary has-[:focus-visible]:outline-primary not-has-data-disabled:not-has-data-checked:hover:bg-surface-hover relative flex min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 transition-colors has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3"
            key={value}
          >
            <RadioGroupItem
              aria-describedby={`${id}-${value}-description`}
              aria-label={label}
              className="sr-only"
              value={value}
            />
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center justify-center"
            >
              <Icon className="size-[1.125rem]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm leading-5 font-extrabold">
                {label}
              </span>
              <span className="sr-only" id={`${id}-${value}-description`}>
                {description}
              </span>
            </span>
          </label>
        ))}
        <button
          aria-label="Metronome — Coming soon"
          className="border-border text-muted-foreground flex min-h-12 items-center gap-2 rounded-xl border px-4 py-2 text-sm"
          disabled
          type="button"
        >
          <Timer aria-hidden="true" className="size-[1.125rem]" />
          Metronome <span className="text-[0.65rem]">Coming soon</span>
        </button>
      </RadioGroup>
      {disabled ? (
        <p
          className="text-muted-foreground mt-3 text-xs leading-5"
          id={`${id}-disabled`}
        >
          Stop the current session to change practice mode.
        </p>
      ) : null}
    </fieldset>
  );
}
