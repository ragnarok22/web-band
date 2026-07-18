"use client";

import { AlertTriangle } from "lucide-react";

import { strumActionDetails } from "@/components/practice/strum-action-details";
import { builtInStrummingPatterns } from "@/data/strumming-patterns";
import { isStrummingPatternMeterCompatible } from "@/lib/guided-practice";
import type { TimeSignature } from "@/types/pattern";
import type { StrummingPattern } from "@/types/practice";

interface StrummingTrainerPanelProps {
  disabled?: boolean;
  onChange: (pattern: StrummingPattern) => void;
  pattern: StrummingPattern;
  timeSignature: TimeSignature;
}

export function StrummingTrainerPanel({
  disabled = false,
  onChange,
  pattern,
  timeSignature,
}: StrummingTrainerPanelProps) {
  const compatiblePatterns = builtInStrummingPatterns.filter((candidate) =>
    isStrummingPatternMeterCompatible(candidate, timeSignature),
  );
  const isCompatible = isStrummingPatternMeterCompatible(
    pattern,
    timeSignature,
  );

  return (
    <section
      aria-labelledby="strumming-trainer-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-4">
        <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
          Right-hand rhythm
        </p>
        <h3
          className="text-foreground mt-1 text-lg font-black"
          id="strumming-trainer-heading"
        >
          Strumming trainer
        </h3>
      </div>

      <label className="text-muted-strong text-xs font-bold">
        Pattern for {timeSignature.numerator}/{timeSignature.denominator}
        <select
          aria-describedby={
            !isCompatible ? "strumming-meter-warning" : undefined
          }
          aria-invalid={!isCompatible}
          className="border-border bg-surface-elevated text-foreground focus:border-accent mt-1.5 min-h-11 w-full rounded-lg border px-3 text-sm font-bold outline-none disabled:opacity-45"
          disabled={disabled || compatiblePatterns.length === 0}
          onChange={(event) => {
            const selected = compatiblePatterns.find(
              ({ id }) => id === event.target.value,
            );
            if (selected) onChange(structuredClone(selected));
          }}
          value={isCompatible ? pattern.id : ""}
        >
          {!isCompatible ? (
            <option disabled value="">
              Choose a compatible pattern
            </option>
          ) : null}
          {compatiblePatterns.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </label>

      {!isCompatible ? (
        <div
          className="border-danger/30 bg-danger/8 text-danger mt-3 flex gap-3 rounded-xl border p-3 text-sm leading-5 font-bold"
          id="strumming-meter-warning"
          role="alert"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            {pattern.name} is in {pattern.timeSignature.numerator}/
            {pattern.timeSignature.denominator} and cannot follow this{" "}
            {timeSignature.numerator}/{timeSignature.denominator} drum groove.
            Choose a compatible pattern.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-foreground text-sm font-extrabold">
            {pattern.name}
          </p>
          <p className="text-muted mt-1 text-xs">
            {pattern.subdivision}th-note grid - every action shown
          </p>
        </div>
        <span className="border-border bg-background text-muted-strong rounded-lg border px-2.5 py-1.5 text-xs font-black tabular-nums">
          {pattern.steps.length} steps
        </span>
      </div>

      <ol
        aria-label={`${pattern.name} action sequence`}
        className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8"
      >
        {pattern.steps.map((step, index) => {
          const details = strumActionDetails[step.action];
          return (
            <li
              aria-label={`Step ${index + 1}: ${details.label}${step.accent ? ", accent" : ""}`}
              className={`border-border bg-surface-elevated flex min-h-16 min-w-0 flex-col items-center justify-center rounded-lg border px-1 py-2 ${
                step.accent ? "border-accent/60 text-accent" : "text-foreground"
              }`}
              key={step.id}
            >
              <span
                aria-hidden="true"
                className="text-xl leading-none font-black"
              >
                {details.symbol}
              </span>
              <span className="text-muted-strong mt-1 text-[0.62rem] font-extrabold uppercase">
                {details.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
