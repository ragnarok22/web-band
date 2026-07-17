"use client";

import { motion } from "framer-motion";
import { Pause, Play, Square } from "lucide-react";

import type { AudioEngineStatus } from "@/types/audio";

interface TransportControlsProps {
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  status: AudioEngineStatus;
}

export function TransportControls({
  onPause,
  onPlay,
  onStop,
  status,
}: TransportControlsProps) {
  const isBusy = status === "initializing";
  const isRunning = status === "playing" || status === "counting-in";
  const canStop = isRunning || status === "paused" || status === "suspended";
  const playLabel =
    status === "paused"
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

      <motion.button
        aria-label={playLabel}
        className="play-control bg-accent text-accent-ink hover:bg-accent-strong flex size-24 items-center justify-center rounded-[1.75rem] shadow-[0_14px_45px_rgba(231,169,75,0.24)] transition-colors disabled:opacity-50 sm:size-28"
        disabled={isBusy || isRunning}
        onClick={onPlay}
        type="button"
        whileTap={{ scale: 0.96 }}
      >
        <Play
          aria-hidden="true"
          className="ml-1 size-10 fill-current sm:size-12"
        />
      </motion.button>

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
