"use client";

import { useState } from "react";

import { MAX_BPM, MIN_BPM } from "@/lib/musical-time";
import type { TempoTrainerConfiguration } from "@/types/practice";

interface TempoTrainerPanelProps {
  configuration: TempoTrainerConfiguration;
  disabled?: boolean;
  onChange: (configuration: TempoTrainerConfiguration) => void;
}

type NumericField = "endBpm" | "increment" | "interval" | "startBpm";

interface InvalidDraft {
  field: NumericField;
  message: string;
  value: string;
}

const inputClass =
  "border-border bg-surface-elevated text-foreground focus:border-accent min-h-11 w-full rounded-lg border px-3 text-sm font-bold tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-45";

export function TempoTrainerPanel({
  configuration,
  disabled = false,
  onChange,
}: TempoTrainerPanelProps) {
  const [invalidDraft, setInvalidDraft] = useState<InvalidDraft | null>(null);
  const intervalValue =
    configuration.interval.type === "measures"
      ? configuration.interval.measures
      : configuration.interval.seconds;
  const hasMatchingTempos = configuration.startBpm === configuration.endBpm;

  function updateNumber(
    field: NumericField,
    value: string,
    minimum: number,
    maximum?: number,
  ): void {
    const parsed = Number(value);
    if (
      value.trim() === "" ||
      !Number.isInteger(parsed) ||
      parsed < minimum ||
      (maximum !== undefined && parsed > maximum)
    ) {
      const range =
        maximum === undefined
          ? `${minimum} or more`
          : `${minimum} to ${maximum}`;
      setInvalidDraft({
        field,
        message: `Enter a whole number from ${range}.`,
        value,
      });
      return;
    }

    setInvalidDraft(null);
    if (field === "interval") {
      onChange({
        ...configuration,
        interval:
          configuration.interval.type === "measures"
            ? { measures: parsed, type: "measures" }
            : { seconds: parsed, type: "seconds" },
      });
      return;
    }
    onChange({ ...configuration, [field]: parsed });
  }

  function valueFor(field: NumericField, value: number): string | number {
    return invalidDraft?.field === field ? invalidDraft.value : value;
  }

  const errorId = invalidDraft
    ? `tempo-${invalidDraft.field}-error`
    : undefined;

  return (
    <section
      aria-labelledby="tempo-trainer-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-4">
        <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
          Gradual pace
        </p>
        <h3
          className="text-foreground mt-1 text-lg font-black"
          id="tempo-trainer-heading"
        >
          Tempo trainer
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-muted-strong text-xs font-bold">
          Start BPM
          <input
            aria-describedby={
              invalidDraft?.field === "startBpm" ? errorId : undefined
            }
            aria-invalid={invalidDraft?.field === "startBpm"}
            className={`${inputClass} mt-1.5`}
            disabled={disabled}
            max={MAX_BPM}
            min={MIN_BPM}
            onChange={(event) =>
              updateNumber("startBpm", event.target.value, MIN_BPM, MAX_BPM)
            }
            type="number"
            value={valueFor("startBpm", configuration.startBpm)}
          />
        </label>
        <label className="text-muted-strong text-xs font-bold">
          Target BPM
          <input
            aria-describedby={
              invalidDraft?.field === "endBpm" ? errorId : undefined
            }
            aria-invalid={invalidDraft?.field === "endBpm"}
            className={`${inputClass} mt-1.5`}
            disabled={disabled}
            max={MAX_BPM}
            min={MIN_BPM}
            onChange={(event) =>
              updateNumber("endBpm", event.target.value, MIN_BPM, MAX_BPM)
            }
            type="number"
            value={valueFor("endBpm", configuration.endBpm)}
          />
        </label>
        <label className="text-muted-strong text-xs font-bold">
          Change by
          <input
            aria-describedby={
              invalidDraft?.field === "increment" ? errorId : undefined
            }
            aria-invalid={invalidDraft?.field === "increment"}
            className={`${inputClass} mt-1.5`}
            disabled={disabled}
            min={1}
            onChange={(event) =>
              updateNumber("increment", event.target.value, 1)
            }
            type="number"
            value={valueFor("increment", configuration.increment)}
          />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-muted-strong text-xs font-bold">
          Change interval
        </legend>
        <div className="mt-1.5 grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[1fr_1fr_8rem]">
          {(["measures", "seconds"] as const).map((type) => (
            <label key={type}>
              <input
                checked={configuration.interval.type === type}
                className="peer sr-only"
                disabled={disabled}
                name="tempo-interval-type"
                onChange={() => {
                  setInvalidDraft(null);
                  onChange({
                    ...configuration,
                    interval:
                      type === "measures"
                        ? { measures: intervalValue, type }
                        : { seconds: intervalValue, type },
                  });
                }}
                type="radio"
              />
              <span className="border-border bg-surface-elevated text-muted-strong peer-checked:border-accent/60 peer-checked:text-accent peer-focus-visible:outline-accent flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-extrabold capitalize peer-focus-visible:outline-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-45">
                {type}
              </span>
            </label>
          ))}
          <label className="col-span-2 sm:col-span-1">
            <span className="sr-only">Interval length</span>
            <input
              aria-describedby={
                invalidDraft?.field === "interval" ? errorId : undefined
              }
              aria-invalid={invalidDraft?.field === "interval"}
              className={inputClass}
              disabled={disabled}
              min={1}
              onChange={(event) =>
                updateNumber("interval", event.target.value, 1)
              }
              type="number"
              value={valueFor("interval", intervalValue)}
            />
          </label>
        </div>
      </fieldset>

      {invalidDraft ? (
        <p
          className="text-danger mt-2 text-sm font-bold"
          id={errorId}
          role="alert"
        >
          {invalidDraft.message}
        </p>
      ) : null}
      {hasMatchingTempos ? (
        <p className="text-danger mt-2 text-sm font-bold" role="alert">
          Starting and target BPM must be different.
        </p>
      ) : null}

      <div className="border-border mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2">
        <label className="text-muted-strong flex min-h-11 items-center gap-3 text-sm font-bold">
          <input
            checked={configuration.stopAtTarget}
            className="accent-accent size-5"
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...configuration, stopAtTarget: event.target.checked })
            }
            type="checkbox"
          />
          Stop at target
        </label>
        <label className="text-muted-strong flex min-h-11 items-center gap-3 text-sm font-bold">
          <input
            checked={configuration.resetToStartingBpmOnStop}
            className="accent-accent size-5"
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...configuration,
                resetToStartingBpmOnStop: event.target.checked,
              })
            }
            type="checkbox"
          />
          Reset tempo on stop
        </label>
      </div>
    </section>
  );
}
