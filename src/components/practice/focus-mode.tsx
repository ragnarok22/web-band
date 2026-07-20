"use client";

import { Flag, Minimize2, Play, Square } from "lucide-react";
import { m } from "framer-motion";
import { useEffect, useRef } from "react";

import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import {
  motionTransition,
  pageEntry,
  settled,
  stateEntry,
} from "@/components/motion/motion-presets";
import { BeatVisualizer } from "@/components/practice/beat-visualizer";
import { GuidedPracticeDisplay } from "@/components/practice/guided-practice-display";
import { PracticeNotices } from "@/components/practice/practice-notices";
import { formatPracticeDuration } from "@/hooks/use-practice-timer";
import { useGuidanceSnapshot } from "@/hooks/use-guidance-snapshot";
import type { WakeLockStatus } from "@/hooks/use-wake-lock";
import { WakeLockStatusMessage } from "@/components/practice/wake-lock-status";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type { GuidedPracticeConfiguration } from "@/types/practice";
import type {
  BeatFlashIntensity,
  VisualSubdivisionDetail,
} from "@/types/persistence";

interface FocusModeProps {
  bpm: number;
  beatFlashIntensity: BeatFlashIntensity;
  configuration: GuidedPracticeConfiguration;
  countInMeasures: CountInMeasures;
  elapsedSeconds: number;
  errorMessage: string | null;
  historyNotice: string | null;
  isFinishing: boolean;
  isReady: boolean;
  onDismissNotice: () => void;
  onExit: () => void;
  onFinish: () => void;
  onPlay: () => void;
  onStop: () => void;
  pattern: DrumPattern;
  showOnboarding: boolean;
  status: AudioEngineStatus;
  visualSubdivisionDetail: VisualSubdivisionDetail;
  wakeLockStatus: WakeLockStatus;
}

export function FocusMode({
  bpm,
  beatFlashIntensity,
  configuration,
  countInMeasures,
  elapsedSeconds,
  errorMessage,
  historyNotice,
  isFinishing,
  isReady,
  onDismissNotice,
  onExit,
  onFinish,
  onPlay,
  onStop,
  pattern,
  showOnboarding,
  status,
  visualSubdivisionDetail,
  wakeLockStatus,
}: FocusModeProps) {
  const reducedMotion = useAppReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const snapshot = useGuidanceSnapshot();
  const canResume = status === "paused" || status === "suspended";
  const isRunning = status === "counting-in" || status === "playing";
  const canStop = status === "initializing" || isRunning || canResume;
  const displayedBpm =
    configuration.mode === "tempoTrainer"
      ? snapshot?.mode === "tempoTrainer"
        ? snapshot.position.currentBpm
        : configuration.tempoTrainer.startBpm
      : bpm;
  const transportLabel = canResume
    ? "Resume"
    : isRunning
      ? isFinishing
        ? "Finishing after fill"
        : "Finish with fill"
      : isReady
        ? "Play"
        : "Loading setup";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <m.main
      animate={settled}
      className="bg-background fixed inset-0 z-50 flex min-h-dvh flex-col overflow-y-auto px-4 py-5 sm:px-8 sm:py-8"
      data-motion="focus"
      data-motion-reduced={reducedMotion}
      initial={reducedMotion ? false : pageEntry}
      transition={motionTransition(reducedMotion, 0.14)}
    >
      <header className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
            Focus session
          </p>
          <h1
            className="text-foreground mt-2 text-3xl font-black tracking-[-0.045em] sm:text-5xl"
            ref={headingRef}
            tabIndex={-1}
          >
            {pattern.name}
          </h1>
        </div>
        <button
          className="border-border bg-surface text-muted-strong hover:text-foreground flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold"
          onClick={onExit}
          type="button"
        >
          <Minimize2 aria-hidden="true" className="size-4" />
          Exit focus
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 py-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="border-border bg-surface rounded-2xl border p-5 text-center">
            <p className="text-muted text-xs font-extrabold tracking-[0.16em] uppercase">
              Tempo
            </p>
            <p className="text-foreground mt-2 text-6xl font-black tracking-[-0.06em] tabular-nums sm:text-8xl">
              {displayedBpm}
            </p>
            <p className="text-muted text-xs font-bold">BPM</p>
          </div>
          <div className="border-border bg-surface rounded-2xl border p-5 text-center">
            <p className="text-muted text-xs font-extrabold tracking-[0.16em] uppercase">
              Time
            </p>
            <p className="text-foreground mt-5 text-4xl font-black tabular-nums sm:text-6xl">
              {formatPracticeDuration(elapsedSeconds)}
            </p>
          </div>
        </div>

        <GuidedPracticeDisplay
          configuration={configuration}
          timeSignature={pattern.timeSignature}
        />
        <BeatVisualizer
          countInMeasures={countInMeasures}
          detail={visualSubdivisionDetail}
          intensity={beatFlashIntensity}
          pattern={pattern}
          status={status}
        />
        <PracticeNotices
          countInMeasures={countInMeasures}
          errorMessage={errorMessage}
          noticeMessage={historyNotice}
          onDismiss={onDismissNotice}
          showOnboarding={showOnboarding}
        />
        <WakeLockStatusMessage
          id="focus-wake-lock-status"
          status={wakeLockStatus}
        />

        <button
          className="bg-accent text-accent-ink mx-auto flex min-h-20 w-full max-w-sm items-center justify-center gap-3 rounded-2xl text-xl font-black shadow-[0_18px_55px_var(--shadow)] disabled:opacity-50"
          disabled={
            (!isReady && !canResume) ||
            status === "initializing" ||
            (isRunning && isFinishing)
          }
          onClick={isRunning ? onFinish : onPlay}
          type="button"
        >
          <m.span
            animate={settled}
            className="flex items-center gap-3"
            data-motion="focus-play-state"
            initial={reducedMotion ? false : stateEntry}
            key={transportLabel}
            transition={motionTransition(reducedMotion, 0.1)}
          >
            {isRunning ? (
              <Flag aria-hidden="true" className="size-6 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-7 fill-current" />
            )}
            {transportLabel}
          </m.span>
        </button>
        <button
          className="border-border bg-surface text-muted-strong hover:text-foreground mx-auto flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-extrabold disabled:opacity-35"
          disabled={!canStop}
          onClick={onStop}
          type="button"
        >
          <Square aria-hidden="true" className="size-4 fill-current" />
          Stop now
        </button>
      </div>
    </m.main>
  );
}
