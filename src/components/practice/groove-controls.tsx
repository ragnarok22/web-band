"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import type { FillFrequency } from "@/types/audio";

interface GrooveControlsProps {
  disabled?: boolean;
  fillFrequency: FillFrequency;
  humanization: number;
  onFillFrequencyChange: (frequency: FillFrequency) => void;
  onHumanizationChange: (amount: number) => void;
  onSwingChange: (amount: number) => void;
  swing: number;
}

const fillOptions: Array<{ label: string; value: string }> = [
  { label: "Fills off", value: "off" },
  { label: "Every 4 bars", value: "4" },
  { label: "Every 8 bars", value: "8" },
  { label: "Every 16 bars", value: "16" },
  { label: "Occasionally", value: "random" },
];

function parseFillFrequency(value: string): FillFrequency {
  if (value === "random") return value;
  if (value === "4" || value === "8" || value === "16") {
    return Number(value) as 4 | 8 | 16;
  }
  return null;
}

export function GrooveControls({
  disabled = false,
  fillFrequency,
  humanization,
  onFillFrequencyChange,
  onHumanizationChange,
  onSwingChange,
  swing,
}: GrooveControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const swingPercent = Math.round(swing * 100);
  const humanizationPercent = Math.round(humanization * 100);

  return (
    <section
      aria-labelledby="groove-controls-heading"
      className="border-border bg-surface grid gap-4 rounded-2xl border p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="bg-surface-elevated text-accent flex size-10 items-center justify-center rounded-lg">
          <SlidersHorizontal aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2
            className="text-foreground font-bold"
            id="groove-controls-heading"
          >
            Groove feel
          </h2>
          <p className="text-muted text-xs">Shape the pocket, not the clock</p>
        </div>
      </div>

      <button
        aria-controls="groove-settings"
        aria-expanded={settingsOpen}
        className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-sm font-extrabold transition-colors sm:hidden"
        onClick={() => setSettingsOpen((open) => !open)}
        type="button"
      >
        {settingsOpen ? "Hide groove settings" : "Show groove settings"}
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`${settingsOpen ? "block" : "hidden"} sm:block`}
        id="groove-settings"
      >
        <label className="mb-4 block" htmlFor="swing">
          <span className="text-muted-strong mb-2 flex justify-between text-xs font-bold">
            <span>Swing</span>
            <output htmlFor="swing">{swingPercent}%</output>
          </span>
          <input
            aria-valuetext={`${swingPercent} percent swing`}
            className="tempo-range w-full"
            disabled={disabled}
            id="swing"
            max={0.65}
            min={0}
            onChange={(event) => onSwingChange(Number(event.target.value))}
            step={0.01}
            type="range"
            value={swing}
          />
        </label>

        <label className="mb-4 block" htmlFor="humanization">
          <span className="text-muted-strong mb-2 flex justify-between text-xs font-bold">
            <span>Human touch</span>
            <output htmlFor="humanization">{humanizationPercent}%</output>
          </span>
          <input
            aria-valuetext={`${humanizationPercent} percent humanization`}
            className="tempo-range w-full"
            disabled={disabled}
            id="humanization"
            max={1}
            min={0}
            onChange={(event) =>
              onHumanizationChange(Number(event.target.value))
            }
            step={0.01}
            type="range"
            value={humanization}
          />
        </label>

        <label className="block" htmlFor="fill-frequency">
          <span className="text-muted-strong mb-2 block text-xs font-bold">
            Phrase fills
          </span>
          <select
            className="border-border bg-surface-elevated text-foreground min-h-11 w-full rounded-lg border px-3 text-sm font-bold"
            disabled={disabled}
            id="fill-frequency"
            onChange={(event) =>
              onFillFrequencyChange(parseFillFrequency(event.target.value))
            }
            value={fillFrequency === null ? "off" : String(fillFrequency)}
          >
            {fillOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
