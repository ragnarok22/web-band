"use client";
import { Button } from "@/components/ui/button";

import { Flag, Pause, Play, Square } from "lucide-react";
import { m } from "framer-motion";

import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import {
  motionTransition,
  settled,
  stateEntry,
} from "@/components/motion/motion-presets";
import type { AudioEngineStatus } from "@/types/audio";

interface TransportControlsProps {
  isFinishing?: boolean;
  onFinish: () => void;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  playDisabled?: boolean;
  status: AudioEngineStatus;
}

export function TransportControls({
  isFinishing = false,
  onFinish,
  onPause,
  onPlay,
  onStop,
  playDisabled = false,
  status,
}: TransportControlsProps) {
  const reducedMotion = useAppReducedMotion();
  const isBusy = status === "initializing";
  const isRunning = status === "playing" || status === "counting-in";
  const canStop =
    isBusy || isRunning || status === "paused" || status === "suspended";
  const playLabel = isRunning
    ? isFinishing
      ? "Finishing after fill"
      : "Finish with fill"
    : status === "paused"
      ? "Resume"
      : status === "suspended"
        ? "Resume audio"
        : "Play";

  return (
    <section
      aria-label="Playback controls"
      className="flex items-center justify-center gap-2"
    >
      <Button
        variant="outline"
        size="icon"
        aria-label="Stop playback"
        className="text-muted-strong size-11 rounded-xl disabled:opacity-35"
        disabled={!canStop}
        onClick={onStop}
        type="button"
      >
        <Square aria-hidden="true" className="size-5 fill-current" />
      </Button>

      <Button
        aria-label={playLabel}
        className="play-control bg-primary text-accent-ink hover:bg-accent-strong h-12 min-w-28 rounded-xl px-4 font-extrabold disabled:opacity-50"
        disabled={playDisabled || isBusy || (isRunning && isFinishing)}
        onClick={isRunning ? onFinish : onPlay}
        type="button"
      >
        <m.span
          animate={settled}
          className="flex items-center gap-2 text-sm font-extrabold"
          data-motion="play-state"
          data-motion-reduced={reducedMotion}
          initial={reducedMotion ? false : stateEntry}
          key={playLabel}
          transition={motionTransition(reducedMotion, 0.1)}
        >
          {isRunning ? (
            <>
              <Flag aria-hidden="true" className="size-5 fill-current" />
              Finish
            </>
          ) : (
            <>
              <Play aria-hidden="true" className="size-5 fill-current" />
              {isBusy
                ? "Starting…"
                : status === "paused" || status === "suspended"
                  ? "Resume"
                  : "Play"}
            </>
          )}
        </m.span>
      </Button>

      <Button
        variant="outline"
        size="icon"
        aria-label="Pause playback"
        className="text-muted-strong size-11 rounded-xl disabled:opacity-35"
        disabled={!isRunning}
        onClick={onPause}
        type="button"
      >
        <Pause aria-hidden="true" className="size-5 fill-current" />
      </Button>
    </section>
  );
}
