"use client";

import { useEffect, useRef, useState } from "react";

import { isPracticeRunning, isSessionActive } from "@/lib/audio-status";
import type { AudioEngineStatus } from "@/types/audio";

export function formatPracticeDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function usePracticeTimer(status: AudioEngineStatus): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const accumulatedMsRef = useRef(0);
  const previousStatusRef = useRef<AudioEngineStatus>(status);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === "initializing") {
      accumulatedMsRef.current = 0;
      startedAtRef.current = null;
      const resetId = window.setTimeout(() => setElapsedSeconds(0), 0);
      return () => window.clearTimeout(resetId);
    }

    if (!isPracticeRunning(status)) return;

    const isFreshSession = !isSessionActive(previousStatus);
    if (isFreshSession) accumulatedMsRef.current = 0;
    startedAtRef.current = performance.now();
    const resetId = isFreshSession
      ? window.setTimeout(() => setElapsedSeconds(0), 0)
      : null;
    const update = () => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      setElapsedSeconds(
        Math.floor(
          (accumulatedMsRef.current + performance.now() - startedAt) / 1000,
        ),
      );
    };
    const intervalId = window.setInterval(update, 250);

    return () => {
      window.clearInterval(intervalId);
      if (resetId !== null) window.clearTimeout(resetId);
      const startedAt = startedAtRef.current;
      if (startedAt !== null) {
        accumulatedMsRef.current += performance.now() - startedAt;
        startedAtRef.current = null;
        setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      }
    };
  }, [status]);

  return elapsedSeconds;
}
