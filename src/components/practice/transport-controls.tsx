"use client";

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
      className="flex items-center justify-center gap-3 sm:gap-5"
    >
      <button
        aria-label="Stop playback"
        className="border-border bg-surface text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex size-14 items-center justify-center rounded-xl border transition-colors disabled:opacity-35"
        disabled={!canStop}
        onClick={onStop}
        type="button"
      >
        <Square aria-hidden="true" className="size-5 fill-current" />
      </button>

      <button
        aria-label={playLabel}
        className="play-control bg-accent text-accent-ink hover:bg-accent-strong flex size-24 items-center justify-center rounded-[1.75rem] shadow-[0_14px_45px_rgba(231,169,75,0.24)] transition-[background-color,transform] active:scale-[0.96] disabled:opacity-50 motion-reduce:transform-none sm:size-28"
        disabled={playDisabled || isBusy || (isRunning && isFinishing)}
        onClick={isRunning ? onFinish : onPlay}
        type="button"
      >
        <m.span
          animate={settled}
          className="flex flex-col items-center gap-1 text-xs font-black tracking-wide uppercase"
          data-motion="play-state"
          data-motion-reduced={reducedMotion}
          initial={reducedMotion ? false : stateEntry}
          key={playLabel}
          transition={motionTransition(reducedMotion, 0.1)}
        >
          {isRunning ? (
            <>
              <Flag
                aria-hidden="true"
                className="size-8 fill-current sm:size-9"
              />
              Finish
            </>
          ) : (
            <Play
              aria-hidden="true"
              className="ml-1 size-10 fill-current sm:size-12"
            />
          )}
        </m.span>
      </button>

      <button
        aria-label="Pause playback"
        className="border-border bg-surface text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex size-14 items-center justify-center rounded-xl border transition-colors disabled:opacity-35"
        disabled={!isRunning}
        onClick={onPause}
        type="button"
      >
        <Pause aria-hidden="true" className="size-6 fill-current" />
      </button>
    </section>
  );
}
