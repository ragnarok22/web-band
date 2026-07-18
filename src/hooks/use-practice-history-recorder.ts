"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { guidanceTimeline } from "@/audio/guidance-timeline";
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
  pattern: DrumPattern;
  status: AudioEngineStatus;
}

interface ActiveSession {
  activeMilliseconds: number;
  activeSince: number | null;
  endingBpm: number;
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

function isAudiblePractice(status: AudioEngineStatus): boolean {
  return status === "counting-in" || status === "playing";
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
  pattern,
  status,
}: PracticeHistoryRecorderOptions): void {
  const activeSession = useRef<ActiveSession | null>(null);
  const isMounted = useRef(true);

  const reportSaveError = useEffectEvent(onSaveError);

  const finalize = useEffectEvent((now = performance.now()) => {
    const session = activeSession.current;
    if (!session) return;
    if (session.activeSince !== null) {
      session.activeMilliseconds += Math.max(0, now - session.activeSince);
      session.activeSince = null;
    }
    activeSession.current = null;

    const settings = useHistorySettingsStore.getState();
    const durationSeconds = Math.max(
      1,
      Math.floor(session.activeMilliseconds / 1_000),
    );
    if (
      !settings.enabled ||
      session.activeMilliseconds <= 0 ||
      durationSeconds < settings.minimumDurationSeconds
    ) {
      return;
    }

    const endedAt = new Date().toISOString();
    const record: PracticeSession = {
      ...session.metadata,
      createdAt: session.startedAt,
      durationSeconds,
      endedAt,
      endingBpm: session.endingBpm,
      id: crypto.randomUUID(),
      startedAt: session.startedAt,
      updatedAt: endedAt,
    };
    void usePracticeHistoryStore
      .getState()
      .record(record)
      .catch(() => {
        if (isMounted.current) reportSaveError();
      });
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
    if (isAudiblePractice(status)) {
      if (!activeSession.current) {
        const startingBpm =
          guidedPractice.mode === "tempoTrainer"
            ? guidedPractice.tempoTrainer.startBpm
            : bpm;
        activeSession.current = {
          activeMilliseconds: 0,
          activeSince: now,
          endingBpm: startingBpm,
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
    isMounted.current = true;
    return () => {
      finalize(performance.now());
      isMounted.current = false;
    };
  }, []);
}
