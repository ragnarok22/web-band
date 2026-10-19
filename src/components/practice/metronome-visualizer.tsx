"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { metronomeTimeline } from "@/audio/metronome-timeline";
import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import { Button } from "@/components/ui/button";
import {
  getMetronomeCountLabels,
  getMetronomeMeter,
  getSubdivisionLabel,
} from "@/lib/metronome";
import type { MetronomeConfiguration } from "@/types/practice";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import { useMetronomeSubdivision } from "@/hooks/use-metronome-subdivision";

const subscribe = (listener: () => void) =>
  metronomeTimeline.subscribe(listener);
const getStage = () => metronomeTimeline.getSnapshot()?.stage ?? 0;

export function MetronomeVisualizer({
  configuration: config,
  status,
  countInMeasures,
  onAccentChange,
  accentsDisabled = false,
}: {
  configuration: MetronomeConfiguration;
  status: AudioEngineStatus;
  countInMeasures: CountInMeasures;
  onAccentChange?(index: number): void;
  accentsDisabled?: boolean;
}) {
  const reducedMotion = useAppReducedMotion();
  const subdivision = useMetronomeSubdivision(
    config.trainingMode === "progressive" ? 1 : config.subdivision,
  );
  const stage = useSyncExternalStore(subscribe, getStage, () => 0);
  const meter = getMetronomeMeter(config.timeSignature);
  const lights = useRef<Array<HTMLSpanElement | null>>([]);
  const measure = useRef<HTMLSpanElement>(null);
  const stageMeasure = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let previous: HTMLSpanElement | null = null;
    const unsubscribe = metronomeTimeline.subscribe((frame) => {
      if (previous) previous.dataset.active = "false";
      previous = null;
      if (!frame) {
        if (measure.current) measure.current.textContent = "1";
        if (stageMeasure.current) stageMeasure.current.textContent = "1";
        return;
      }
      const light =
        lights.current[frame.beat * subdivision + frame.subdivisionIndex];
      if (light) {
        light.dataset.active = "true";
        previous = light;
      }
      if (measure.current) measure.current.textContent = String(frame.measure);
      if (stageMeasure.current)
        stageMeasure.current.textContent = String(frame.stageMeasure);
    });
    return () => {
      unsubscribe();
      if (previous) previous.dataset.active = "false";
    };
  }, [subdivision]);
  const activeLabel = getSubdivisionLabel(subdivision, config.timeSignature);
  return (
    <section
      aria-label="Beat visualization"
      className="min-w-0 px-4 py-4 sm:px-6"
      data-motion-reduced={reducedMotion}
    >
      <div className="text-muted-foreground mb-3 flex flex-wrap justify-between gap-2 text-[0.65rem] font-bold tracking-[0.14em] uppercase">
        <span>
          {status === "counting-in"
            ? `Count-in · ${countInMeasures} ${countInMeasures === 1 ? "bar" : "bars"}`
            : "Follow the beat"}
        </span>
        <span>
          Measure <span ref={measure}>1</span>
        </span>
      </div>
      <div className="mx-auto grid max-w-3xl grid-cols-2 justify-center gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-8">
        {Array.from({ length: meter.pulsesPerMeasure }, (_, beat) => {
          const labels = getMetronomeCountLabels(
            subdivision,
            beat,
            config.timeSignature,
          );
          const primaryLight = (
            <span
              ref={(element) => {
                lights.current[beat * subdivision] = element;
              }}
              data-active="false"
              data-accent={config.accentPattern[beat]}
              className="border-border-strong bg-surface-elevated data-[accent=true]:border-primary/70 data-[active=true]:border-primary data-[active=true]:bg-primary flex size-9 items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none"
            >
              <span className="bg-primary data-[active=true]:bg-accent-ink size-1.5 rounded-full" />
            </span>
          );
          return (
            <div className="min-w-0 text-center sm:w-24" key={beat}>
              <span className="text-foreground text-lg font-extrabold tabular-nums">
                {beat + 1}
              </span>
              {onAccentChange ? (
                <Button
                  variant="ghost"
                  aria-label={`Accent beat ${beat + 1}`}
                  aria-pressed={config.accentPattern[beat]}
                  disabled={accentsDisabled}
                  className="mx-auto flex size-11 items-center justify-center rounded-full p-0"
                  onClick={() => onAccentChange(beat)}
                >
                  {primaryLight}
                </Button>
              ) : (
                <div className="flex h-11 justify-center">{primaryLight}</div>
              )}
              <div
                aria-hidden="true"
                className="text-muted-strong mx-auto mt-1 flex max-w-28 items-center justify-around gap-1 text-xs font-semibold"
              >
                {labels.map((label, index) =>
                  index === 0 ? (
                    <span key={index} className="min-w-4">
                      {label}
                    </span>
                  ) : (
                    <span
                      key={index}
                      className="flex min-w-4 flex-col items-center gap-1"
                    >
                      <span
                        ref={(element) => {
                          lights.current[beat * subdivision + index] = element;
                        }}
                        data-active="false"
                        className="border-border-strong bg-surface-elevated data-[active=true]:border-primary data-[active=true]:bg-primary size-2.5 rounded-full border transition-colors motion-reduce:transition-none"
                      />
                      {label}
                    </span>
                  ),
                )}
              </div>
              {meter.compound ? (
                <p
                  className="text-muted-foreground mt-2 text-[0.6rem] tabular-nums"
                  aria-label={`Eighth-note positions ${beat * 3 + 1} to ${beat * 3 + 3}`}
                >
                  {beat * 3 + 1} · {beat * 3 + 2} · {beat * 3 + 3}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {onAccentChange ? (
        <p className="text-muted-foreground mt-4 text-center text-xs">
          Tap a beat to toggle its accent.
        </p>
      ) : null}
      {config.trainingMode === "progressive" ? (
        <div
          className="border-border mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
          aria-label="Progressive training"
        >
          <div>
            <p className="text-primary text-[0.65rem] font-bold tracking-wider uppercase">
              Progressive training
            </p>
            <p className="text-foreground mt-1 text-sm font-bold">
              Stage {stage + 1} of 4
            </p>
            <p className="text-muted-strong mt-1 text-xs">{activeLabel}</p>
          </div>
          <div className="text-muted-foreground text-right text-xs">
            <p>
              Measure <span ref={stageMeasure}>1</span> of{" "}
              {config.measuresPerStage}
            </p>
            <p className="mt-1">
              {stage < 3
                ? `Next: ${getSubdivisionLabel(stage + 2, config.timeSignature)}`
                : config.endBehavior === "repeat"
                  ? "Next: Repeat cycle"
                  : config.endBehavior === "stop"
                    ? "Stop after this stage"
                    : "Hold this subdivision"}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
