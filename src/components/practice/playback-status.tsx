"use client";

import { CircleAlert, CircleDot } from "lucide-react";
import { useEffect, useRef } from "react";

import { visualTimeline } from "@/audio/visual-timeline";
import { audioStatusCopy } from "@/lib/audio-status";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";

interface PlaybackStatusProps {
  countInMeasures: CountInMeasures;
  errorMessage: string | null;
  isReady: boolean;
  status: AudioEngineStatus;
  timeSignature: TimeSignature;
}

export function PlaybackStatus({
  countInMeasures,
  errorMessage,
  isReady,
  status,
  timeSignature,
}: PlaybackStatusProps) {
  const remainingRef = useRef<HTMLSpanElement>(null);
  const beatsPerMeasure = timeSignature.numerator;
  const totalClicks = Math.max(1, countInMeasures) * beatsPerMeasure;
  const isError = status === "error";
  const Indicator = isError ? CircleAlert : CircleDot;
  const presentation = statusPresentation[status];

  useEffect(() => {
    if (status !== "counting-in") return;
    // Display only: the existing audible timeline remains the sole clock.
    return visualTimeline.subscribe((frame) => {
      if (!remainingRef.current) return;
      if (!frame) {
        remainingRef.current.textContent = String(totalClicks);
      } else if (frame.phase === "count-in") {
        const elapsedClicks =
          (frame.measure - 1) * beatsPerMeasure + frame.beat;
        remainingRef.current.textContent = String(
          Math.max(1, totalClicks - elapsedClicks),
        );
      }
    });
  }, [beatsPerMeasure, status, totalClicks]);

  return (
    <div
      className="max-w-xs min-w-0 text-xs"
      data-playback-state={status}
      role={isError ? "alert" : undefined}
    >
      <div className="text-muted-strong flex min-h-6 items-center gap-1.5 font-semibold">
        <Indicator
          aria-hidden="true"
          className={`${presentation.color} size-3.5 shrink-0`}
          data-testid="playback-status-indicator"
        />
        <span data-testid="transport-status" title={audioStatusCopy[status]}>
          {isReady || isError
            ? presentation.label
            : "Loading your saved practice setup…"}
        </span>
        {status === "counting-in" ? (
          <span
            aria-hidden="true"
            className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold tabular-nums"
            data-testid="count-in-remaining"
            ref={remainingRef}
          >
            {totalClicks}
          </span>
        ) : null}
      </div>
      {isError ? (
        <p className="text-danger mt-1 leading-5 wrap-anywhere">
          {errorMessage || "Press Play to try again."}
        </p>
      ) : null}
    </div>
  );
}

const statusPresentation: Record<
  AudioEngineStatus,
  { label: string; color: string }
> = {
  "not-initialized": { label: "Ready", color: "text-muted-foreground" },
  initializing: { label: "Starting audio…", color: "text-muted-foreground" },
  ready: { label: "Ready", color: "text-muted-foreground" },
  "counting-in": { label: "Counting in", color: "text-primary" },
  playing: { label: "Playing", color: "text-success" },
  paused: { label: "Paused", color: "text-primary" },
  stopped: { label: "Stopped", color: "text-muted-foreground" },
  suspended: {
    label: "Audio suspended — press Play to resume",
    color: "text-primary",
  },
  error: { label: "Audio unavailable", color: "text-danger" },
};
