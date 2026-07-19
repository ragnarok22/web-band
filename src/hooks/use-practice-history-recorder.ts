"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { clampHistoryMinimumDurationSeconds } from "@/lib/history-settings";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import type { AudioEngineStatus } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type { PracticeSession } from "@/types/persistence";
import type { GuidedPracticeConfiguration } from "@/types/practice";

interface PracticeHistoryRecorderOptions {
  bpm: number;
  guidedPractice: GuidedPracticeConfiguration;
  onSaveError: () => void;
  onSaveSuccess: () => void;
  pattern: DrumPattern;
  status: AudioEngineStatus;
}

interface ActiveSession {
  activeMilliseconds: number;
  activeSince: number | null;
  endingBpm: number;
  id: string;
  metadata: Pick<
    PracticeSession,
    | "category"
    | "patternId"
    | "patternName"
    | "practiceMode"
    | "startingBpm"
    | "timeSignature"
  >;
  startedAt: string;
}

const MAX_SESSION_DURATION_SECONDS = 86_400;

function isRecordedPractice(status: AudioEngineStatus): boolean {
  return status === "playing";
}

function isFinalStatus(status: AudioEngineStatus): boolean {
  return (
    status === "stopped" || status === "error" || status === "not-initialized"
  );
}

export function usePracticeHistoryRecorder({
  bpm,
  guidedPractice,
  onSaveError,
  onSaveSuccess,
  pattern,
  status,
}: PracticeHistoryRecorderOptions): void {
  const activeSession = useRef<ActiveSession | null>(null);
  const isMounted = useRef(true);

  const reportSaveError = useEffectEvent(onSaveError);
  const reportSaveSuccess = useEffectEvent(onSaveSuccess);

  const persistSnapshot = useEffectEvent(
    (session: ActiveSession, activeMilliseconds: number): void => {
      const settings = useHistorySettingsStore.getState();
      const minimumDurationMilliseconds =
        clampHistoryMinimumDurationSeconds(settings.minimumDurationSeconds) *
        1_000;
      if (
        !settings.enabled ||
        activeMilliseconds < minimumDurationMilliseconds
      ) {
        return;
      }

      const durationSeconds = Math.min(
        MAX_SESSION_DURATION_SECONDS,
        Math.floor(activeMilliseconds / 1_000),
      );
      const earliestValidEnd =
        Date.parse(session.startedAt) + durationSeconds * 1_000;
      const endedAt = new Date(
        Math.max(Date.now(), earliestValidEnd),
      ).toISOString();
      const record: PracticeSession = {
        ...session.metadata,
        createdAt: session.startedAt,
        durationSeconds,
        endedAt,
        endingBpm: session.endingBpm,
        id: session.id,
        startedAt: session.startedAt,
        updatedAt: endedAt,
      };
      void usePracticeHistoryStore
        .getState()
        .record(record)
        .then(() => {
          if (isMounted.current) reportSaveSuccess();
        })
        .catch(() => {
          if (isMounted.current) reportSaveError();
        });
    },
  );

  const checkpoint = useEffectEvent((now = performance.now()) => {
    const session = activeSession.current;
    if (!session) return;
    const activeMilliseconds =
      session.activeMilliseconds +
      (session.activeSince === null
        ? 0
        : Math.max(0, now - session.activeSince));
    persistSnapshot(session, activeMilliseconds);
  });

  const finalize = useEffectEvent((now = performance.now()) => {
    const session = activeSession.current;
    if (!session) return;
    if (session.activeSince !== null) {
      session.activeMilliseconds += Math.max(0, now - session.activeSince);
      session.activeSince = null;
    }
    activeSession.current = null;
    persistSnapshot(session, session.activeMilliseconds);
  });

  useEffect(() => {
    return guidanceTimeline.subscribe((frame) => {
      if (
        frame?.mode === "tempoTrainer" &&
        activeSession.current?.metadata.practiceMode === "tempoTrainer"
      ) {
        activeSession.current.endingBpm = frame.position.currentBpm;
      }
    });
  }, []);

  useEffect(() => {
    const now = performance.now();
    if (isRecordedPractice(status)) {
      if (!activeSession.current) {
        const startingBpm =
          guidedPractice.mode === "tempoTrainer"
            ? guidedPractice.tempoTrainer.startBpm
            : bpm;
        activeSession.current = {
          activeMilliseconds: 0,
          activeSince: now,
          endingBpm: startingBpm,
          id: crypto.randomUUID(),
          metadata: {
            category: pattern.category,
            patternId: pattern.id,
            patternName: pattern.name,
            practiceMode: guidedPractice.mode,
            startingBpm,
            timeSignature: `${pattern.timeSignature.numerator}/${pattern.timeSignature.denominator}`,
          },
          startedAt: new Date().toISOString(),
        };
      } else if (activeSession.current.activeSince === null) {
        activeSession.current.activeSince = now;
      }
      if (activeSession.current.metadata.practiceMode !== "tempoTrainer") {
        activeSession.current.endingBpm = bpm;
      }
      return;
    }

    const session = activeSession.current;
    if (session?.metadata.practiceMode !== "tempoTrainer" && session) {
      session.endingBpm = bpm;
    }
    if (session?.activeSince !== null && session) {
      session.activeMilliseconds += Math.max(0, now - session.activeSince);
      session.activeSince = null;
    }
    if (isFinalStatus(status)) finalize(now);
  }, [bpm, guidedPractice, pattern, status]);

  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.visibilityState === "hidden") checkpoint();
    }

    function handlePageHide(): void {
      checkpoint();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      finalize(performance.now());
      isMounted.current = false;
    };
  }, []);
}
