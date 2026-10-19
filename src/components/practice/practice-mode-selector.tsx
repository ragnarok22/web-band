"use client";

import {
  ArrowDownUp,
  Drum,
  Gauge,
  Guitar,
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
    description: "Build speed in measured steps.",
    icon: Gauge,
    label: "Tempo",
    value: "tempoTrainer",
  },
  {
    description: "Follow a timed chord progression.",
    icon: Guitar,
    label: "Chords",
    value: "chords",
  },
  {
    description: "Practice a complete strum pattern.",
    icon: ArrowDownUp,
    label: "Strumming",
    value: "strumming",
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
        className="grid grid-cols-1 gap-2.5 @min-[17rem]/practice-modes:grid-cols-2 @min-[40rem]/practice-modes:grid-cols-4"
        value={mode}
        disabled={disabled}
        onValueChange={(value) => onChange(value as PracticeMode)}
      >
        {modes.map(({ description, icon: Icon, label, value }) => (
          <label
            className="group/mode border-border bg-surface text-foreground has-data-checked:border-primary/65 has-data-checked:bg-primary/8 has-data-checked:text-primary has-[:focus-visible]:outline-primary not-has-data-disabled:not-has-data-checked:hover:border-border-strong not-has-data-disabled:not-has-data-checked:hover:bg-surface-hover relative flex h-full min-h-24 w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors has-data-disabled:cursor-not-allowed has-data-disabled:opacity-45 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 @min-[17rem]/practice-modes:min-h-36 @min-[17rem]/practice-modes:flex-col @min-[17rem]/practice-modes:items-start"
            key={value}
          >
            <RadioGroupItem
              aria-describedby={`${id}-${value}-description`}
              aria-label={label}
              className="absolute top-1/2 right-3 -translate-y-1/2 @min-[17rem]/practice-modes:top-3 @min-[17rem]/practice-modes:translate-y-0"
              value={value}
            />
            <span
              aria-hidden="true"
              className="bg-surface-elevated text-muted-strong group-has-data-checked/mode:bg-primary/15 group-has-data-checked/mode:text-primary flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            >
              <Icon className="size-[1.125rem]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 pr-6 @min-[17rem]/practice-modes:pr-0">
              <span className="block text-sm leading-5 font-extrabold">
                {label}
              </span>
              <span
                className="text-muted-foreground mt-1 block text-xs leading-5"
                id={`${id}-${value}-description`}
              >
                {description}
              </span>
            </span>
          </label>
        ))}
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
