"use client";

import { useId } from "react";

import { useRhythmPreview } from "@/hooks/use-rhythm-preview";
import { getStepsPerBar } from "@/lib/musical-time";
import type { AudioEngineStatus } from "@/types/audio";
import type { DrumInstrument, DrumPattern } from "@/types/pattern";

interface RhythmPreviewProps {
  isPreviewing?: boolean;
  pattern: DrumPattern;
  status?: AudioEngineStatus;
}

const rows: Array<{
  instruments: DrumInstrument[];
  label: string;
  description: string;
}> = [
  {
    instruments: ["closedHat", "openHat", "ride", "crash"],
    label: "Top",
    description: "Hi-hat, ride and crash cymbals",
  },
  {
    instruments: ["snare", "rim", "clap"],
    label: "Backbeat",
    description: "Snare, rim and handclap",
  },
  { instruments: ["kick"], label: "Kick", description: "Bass drum" },
  {
    instruments: ["lowTom", "midTom", "highTom"],
    label: "Toms",
    description: "Low, middle and high tom drums",
  },
];

function playbackLabel(status: AudioEngineStatus) {
  if (status === "counting-in") return "Count-in";
  if (status === "initializing") return "Starting";
  if (status === "paused" || status === "suspended") return "Paused";
  return status === "playing" ? "Playing" : "Preview";
}

export function RhythmPreview({
  isPreviewing = false,
  pattern,
  status = "playing",
}: RhythmPreviewProps) {
  const descriptionId = useId();
  const rootRef = useRhythmPreview(
    pattern,
    isPreviewing && status === "playing",
  );
  const stepCount = getStepsPerBar(pattern.timeSignature, pattern.subdivision);
  const isCompound =
    pattern.timeSignature.denominator === 8 &&
    pattern.timeSignature.numerator > 3 &&
    pattern.timeSignature.numerator % 3 === 0;
  const stepsPerBeat =
    (pattern.subdivision / pattern.timeSignature.denominator) *
    (isCompound ? 3 : 1);
  const beats = Array.from(
    { length: stepCount / stepsPerBeat },
    (_, index) => ({
      start: index * stepsPerBeat,
      steps: Array.from(
        { length: stepsPerBeat },
        (_, offset) => index * stepsPerBeat + offset,
      ),
    }),
  );
  const visibleRows = rows.filter(
    (row) =>
      row.label !== "Toms" ||
      pattern.hits.some((hit) => row.instruments.includes(hit.instrument)),
  );
  const velocities = new Map<string, number>();
  for (const hit of pattern.hits) {
    const row = visibleRows.find((candidate) =>
      candidate.instruments.includes(hit.instrument),
    );
    if (!row) continue;
    const key = `${row.label}:${hit.step}`;
    velocities.set(key, Math.max(velocities.get(key) ?? 0, hit.velocity));
  }

  return (
    <div
      aria-label={`${pattern.name} rhythm preview`}
      aria-describedby={descriptionId}
      ref={rootRef}
      role="img"
    >
      <span className="sr-only" data-rhythm-description="" id={descriptionId}>
        Measure 1 of {pattern.bars}. Beat numbers mark the main pulses.
      </span>
      {Array.from({ length: pattern.bars }, (_, measure) => (
        <div
          className="space-y-1"
          data-rhythm-measure={measure}
          hidden={measure !== 0}
          key={measure}
        >
          <div aria-hidden="true" className="mb-1 flex items-center gap-2">
            <span
              className={`w-14 shrink-0 text-[0.625rem] font-semibold ${isPreviewing ? "text-primary" : "text-muted-foreground"}`}
              title={
                pattern.bars > 1
                  ? `Measure ${measure + 1} of ${pattern.bars}${isPreviewing ? ` — ${playbackLabel(status)}` : ""}`
                  : undefined
              }
            >
              {pattern.bars > 1
                ? `${measure + 1}/${pattern.bars}`
                : isPreviewing
                  ? playbackLabel(status)
                  : "Beats"}
            </span>
            <span
              className="grid min-w-0 flex-1 gap-1"
              style={{
                gridTemplateColumns: `repeat(${beats.length}, minmax(0, 1fr))`,
              }}
            >
              {beats.map((beat, index) => (
                <span
                  className="text-muted-foreground data-[active=true]:text-primary text-[0.625rem] leading-3 font-bold tabular-nums"
                  data-beat-label={index + 1}
                  data-start-step={beat.start}
                  data-end-step={beat.start + stepsPerBeat}
                  key={beat.start}
                >
                  {index + 1}
                </span>
              ))}
            </span>
          </div>
          {visibleRows.map((row) => (
            <div
              className="flex items-center gap-2"
              data-row={row.label}
              key={row.label}
            >
              <span
                className="text-muted-strong w-14 shrink-0 text-[0.6875rem] leading-4 font-medium"
                title={row.description}
              >
                {row.label}
              </span>
              <span
                aria-hidden="true"
                className="grid min-w-0 flex-1 gap-1"
                style={{
                  gridTemplateColumns: `repeat(${beats.length}, minmax(0, 1fr))`,
                }}
              >
                {beats.map((beat) => (
                  <span
                    className="grid min-w-0 gap-0.5"
                    key={beat.start}
                    style={{
                      gridTemplateColumns: `repeat(${stepsPerBeat}, minmax(0, 1fr))`,
                    }}
                  >
                    {beat.steps.map((step) => {
                      const velocity = velocities.get(
                        `${row.label}:${measure * stepCount + step}`,
                      );
                      return (
                        <span
                          className="bg-muted-foreground/35 ring-muted-foreground/20 data-[main-beat=true]:ring-muted-foreground/45 data-[hit=true]:bg-primary/75 data-[hit=true]:ring-primary/50 data-[hit=true]:data-[accent=true]:bg-primary data-[active=true]:outline-primary block h-2 rounded-[0.125rem] ring-1 ring-inset data-[active=true]:outline-2 data-[active=true]:outline-offset-1"
                          data-rhythm-cell=""
                          data-step={step}
                          data-main-beat={step === beat.start || undefined}
                          data-hit={velocity !== undefined || undefined}
                          data-accent={
                            (velocity !== undefined && velocity >= 0.8) ||
                            undefined
                          }
                          key={step}
                        />
                      );
                    })}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
