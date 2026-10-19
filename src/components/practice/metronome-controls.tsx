"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMetronomeMeter,
  getSubdivisionLabel,
  metronomeMeters,
  metronomeSubdivisions,
} from "@/lib/metronome";
import type { MetronomeConfiguration } from "@/types/practice";
import { useMetronomeSubdivision } from "@/hooks/use-metronome-subdivision";

export function MetronomeChoice({
  label,
  value,
  choices,
  disabled = false,
  className = "flex flex-wrap",
  onChange,
}: {
  label: string;
  value: string;
  choices: ReadonlyArray<{
    value: string;
    label: string;
    description?: string;
  }>;
  disabled?: boolean;
  className?: string;
  onChange(value: string): void;
}) {
  return (
    <RadioGroup
      aria-label={label}
      className={`min-w-0 gap-1.5 ${className}`}
      value={value}
      disabled={disabled}
      onValueChange={onChange}
    >
      {choices.map((choice) => (
        <label
          key={choice.value}
          title={choice.description}
          className="border-border text-muted-strong has-data-checked:border-primary/60 has-data-checked:bg-primary/10 has-data-checked:text-primary has-[:focus-visible]:outline-primary relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
        >
          <RadioGroupItem
            className="sr-only"
            value={choice.value}
            aria-label={choice.description ?? choice.label}
          />
          {choice.label}
        </label>
      ))}
    </RadioGroup>
  );
}

export function MetronomeControls({
  configuration: config,
  disabled,
  active,
  onChange,
}: {
  configuration: MetronomeConfiguration;
  disabled: boolean;
  active: boolean;
  onChange(config: MetronomeConfiguration): void;
}) {
  const meter = getMetronomeMeter(config.timeSignature);
  const activeSubdivision = useMetronomeSubdivision(1);
  const meterValue = `${config.timeSignature.numerator}/${config.timeSignature.denominator}`;
  return (
    <div className="border-border space-y-3 border-b px-4 py-4 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div>
          <h2 className="text-foreground text-sm font-extrabold tracking-[0.14em] uppercase">
            Metronome
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {meter.compound
              ? `${meter.pulsesPerMeasure} dotted-quarter pulses · 3 eighths per pulse`
              : `${meter.pulsesPerMeasure} quarter-note beats per bar`}
          </p>
        </div>
        <div className="w-24 sm:w-28">
          <Select
            value={meterValue}
            disabled={disabled || active}
            onValueChange={(value) => {
              const next = metronomeMeters.find(
                (candidate) =>
                  `${candidate.numerator}/${candidate.denominator}` === value,
              );
              if (next)
                onChange({
                  ...config,
                  timeSignature: { ...next },
                  accentPattern: Array.from(
                    { length: getMetronomeMeter(next).pulsesPerMeasure },
                    (_, index) => index === 0,
                  ),
                });
            }}
          >
            <SelectTrigger
              aria-label="Time signature"
              title={
                active ? "Stop playback to change meter" : "Time signature"
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metronomeMeters.map((candidate) => {
                const value = `${candidate.numerator}/${candidate.denominator}`;
                return (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-[0.65rem] font-bold tracking-[0.14em] uppercase">
          Subdivision · attacks per pulse
        </p>
        <MetronomeChoice
          label="Subdivision"
          className="grid grid-cols-2 sm:flex sm:flex-wrap"
          disabled={disabled || config.trainingMode === "progressive"}
          value={String(
            config.trainingMode === "progressive"
              ? activeSubdivision
              : config.subdivision,
          )}
          onChange={(value) =>
            onChange({
              ...config,
              subdivision: Number(
                value,
              ) as MetronomeConfiguration["subdivision"],
            })
          }
          choices={metronomeSubdivisions.map((count) => ({
            value: String(count),
            label: `${count} · ${meter.compound ? ["Pulse", "Two", "Eighth", "Four"][count - 1] : ["Quarter", "Eighth", "Triplet", "Sixteenth"][count - 1]}`,
            description: `${count} — ${getSubdivisionLabel(count, config.timeSignature)}`,
          }))}
        />
        <p className="text-muted-foreground mt-2 text-xs">
          {config.trainingMode === "progressive"
            ? "Training selects the subdivision automatically."
            : getSubdivisionLabel(config.subdivision, config.timeSignature)}
          {active && config.trainingMode === "manual"
            ? " · Changes enter at the next safe bar."
            : ""}
        </p>
      </div>
    </div>
  );
}

export function MetronomePracticeOptions({
  configuration: config,
  disabled,
  active,
  onChange,
}: {
  configuration: MetronomeConfiguration;
  disabled: boolean;
  active: boolean;
  onChange(config: MetronomeConfiguration): void;
}) {
  return (
    <div className="border-border flex flex-wrap gap-x-8 gap-y-4 border-t px-4 py-4 sm:px-6">
      <div>
        <p className="text-muted-foreground mb-2 text-[0.65rem] font-bold tracking-wider uppercase">
          Subdivision audio
        </p>
        <MetronomeChoice
          label="Subdivision audio"
          value={config.subdivisionAudioMode}
          disabled={disabled}
          onChange={(value) =>
            onChange({
              ...config,
              subdivisionAudioMode:
                value as MetronomeConfiguration["subdivisionAudioMode"],
            })
          }
          choices={[
            { value: "pulse-only", label: "Pulse Only" },
            { value: "pulse-guide", label: "Pulse + Guide" },
          ]}
        />
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-[0.65rem] font-bold tracking-wider uppercase">
          Training
        </p>
        <MetronomeChoice
          label="Training"
          value={config.trainingMode}
          disabled={disabled || active}
          onChange={(value) =>
            onChange({
              ...config,
              trainingMode: value as MetronomeConfiguration["trainingMode"],
            })
          }
          choices={[
            { value: "manual", label: "Manual" },
            { value: "progressive", label: "Progressive" },
          ]}
        />
      </div>
    </div>
  );
}
