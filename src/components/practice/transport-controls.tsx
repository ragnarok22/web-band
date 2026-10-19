"use client";
import { Button } from "@/components/ui/button";

import { Flag, Pause, Play, Square } from "lucide-react";
import { m } from "framer-motion";
import { useId } from "react";

import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import {
  motionTransition,
  settled,
  stateEntry,
} from "@/components/motion/motion-presets";
import type { AudioEngineStatus } from "@/types/audio";

interface TransportControlsProps {
  isFinishing?: boolean;
  finishWithFill?: boolean;
  onFinish: () => void;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  playDisabled?: boolean;
  status: AudioEngineStatus;
}

export function TransportControls({
  isFinishing = false,
  finishWithFill = true,
  onFinish,
  onPause,
  onPlay,
  onStop,
  playDisabled = false,
  status,
}: TransportControlsProps) {
  const reducedMotion = useAppReducedMotion();
  const descriptionId = useId();
  const isBusy = status === "initializing";
  const isRunning = status === "playing" || status === "counting-in";
  const canStop =
    isBusy || isRunning || status === "paused" || status === "suspended";
  const action = getPlaybackAction(status, isFinishing, finishWithFill);
  const runningAction = finishWithFill ? onFinish : onPause;
  const stopHint = canStop
    ? "Stop immediately (Esc)."
    : "Start playback to enable Stop.";
  const pauseHint = getPauseHint(status);
  const playHint = playDisabled
    ? "Loading your saved practice setup."
    : action.description;

  return (
    <section
      aria-label="Playback controls"
      className="flex items-center justify-center gap-2"
    >
      <Button
        variant="outline"
        size="icon"
        aria-label="Stop playback"
        aria-describedby={`${descriptionId}-stop`}
        title={stopHint}
        className="text-foreground disabled:text-muted-foreground size-11 rounded-xl disabled:opacity-35"
        disabled={!canStop}
        onClick={onStop}
        type="button"
      >
        <Square aria-hidden="true" className="size-5 fill-current" />
      </Button>

      <Button
        aria-label={action.label}
        aria-busy={isBusy}
        aria-describedby={`${descriptionId}-play`}
        title={playHint}
        className="play-control bg-primary text-accent-ink hover:bg-accent-strong h-12 min-w-28 rounded-xl px-4 font-extrabold disabled:opacity-50"
        disabled={playDisabled || isBusy || (isRunning && isFinishing)}
        onClick={isRunning ? runningAction : onPlay}
        type="button"
      >
        <m.span
          animate={settled}
          className="flex items-center gap-2 text-sm font-extrabold"
          data-motion="play-state"
          data-motion-reduced={reducedMotion}
          initial={reducedMotion ? false : stateEntry}
          key={action.label}
          transition={motionTransition(reducedMotion, 0.1)}
        >
          <PlaybackActionIcon
            isRunning={isRunning}
            finishWithFill={finishWithFill}
          />
          {action.caption}
        </m.span>
      </Button>

      {finishWithFill ? (
        <Button
          variant="outline"
          size="icon"
          aria-label="Pause playback"
          aria-describedby={`${descriptionId}-pause`}
          title={pauseHint}
          className="text-foreground disabled:text-muted-foreground size-11 rounded-xl disabled:opacity-35"
          disabled={!isRunning}
          onClick={onPause}
          type="button"
        >
          <Pause aria-hidden="true" className="size-5 fill-current" />
        </Button>
      ) : null}
      <span className="sr-only" id={`${descriptionId}-stop`}>
        {stopHint}
      </span>
      <span className="sr-only" id={`${descriptionId}-play`}>
        {playHint}
      </span>
      <span className="sr-only" id={`${descriptionId}-pause`}>
        {pauseHint}
      </span>
    </section>
  );
}

function getPauseHint(status: AudioEngineStatus): string {
  if (status === "playing" || status === "counting-in") {
    return "Pause and keep your position (Space).";
  }
  if (status === "paused") return "Resume playback to enable Pause.";
  return "Start playback to enable Pause.";
}

function PlaybackActionIcon({
  isRunning,
  finishWithFill,
}: {
  isRunning: boolean;
  finishWithFill: boolean;
}) {
  if (!isRunning)
    return <Play aria-hidden="true" className="size-5 fill-current" />;
  if (finishWithFill)
    return <Flag aria-hidden="true" className="size-5 fill-current" />;
  return <Pause aria-hidden="true" className="size-5 fill-current" />;
}

function getPlaybackAction(
  status: AudioEngineStatus,
  isFinishing: boolean,
  finishWithFill: boolean,
) {
  if (status === "playing" || status === "counting-in") {
    if (!finishWithFill)
      return {
        label: "Pause playback",
        caption: "Pause",
        description: "Pause and keep your position (Space).",
      };
    return {
      label: isFinishing ? "Finishing after fill" : "Finish with fill",
      caption: "Finish",
      description: isFinishing
        ? "Finishing after a transition fill. Stop remains available."
        : "Finish gracefully after a transition fill.",
    };
  }
  if (status === "paused")
    return {
      label: "Resume",
      caption: "Resume",
      description: "Resume from your paused position (Space).",
    };
  if (status === "suspended")
    return {
      label: "Resume audio",
      caption: "Resume",
      description: "Resume browser audio (Space).",
    };
  return {
    label: "Play",
    caption: status === "initializing" ? "Starting…" : "Play",
    description:
      status === "initializing"
        ? "Starting the audio engine."
        : "Start playback (Space).",
  };
}
