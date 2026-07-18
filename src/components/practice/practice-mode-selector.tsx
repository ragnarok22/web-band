"use client";

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
      role="radiogroup"
    >
      <legend className="sr-only">Practice mode</legend>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((choice, index) => (
          <label className="flex min-w-0" key={choice.value}>
            <input
              checked={mode === choice.value}
              className="peer sr-only"
              disabled={disabled}
              name="practice-mode"
              onChange={() => onChange(choice.value)}
              type="radio"
              value={choice.value}
            />
            <span className="border-border bg-surface-elevated text-muted-strong peer-checked:border-accent/60 peer-checked:bg-accent/10 peer-checked:text-accent peer-focus-visible:outline-accent flex h-full min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-45">
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
                <span className="text-muted mt-0.5 hidden text-[0.68rem] leading-4 xl:block">
                  {choice.description}
                </span>
              </span>
            </span>
          </label>
        ))}
      </div>
      {disabled ? (
        <p className="text-muted mt-2 text-xs" id="practice-mode-disabled">
          Stop the current session to change practice mode.
        </p>
      ) : null}
    </fieldset>
  );
}
