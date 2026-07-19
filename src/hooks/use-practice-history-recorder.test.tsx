import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { basicRockPattern } from "@/data/patterns";
import { usePracticeHistoryRecorder } from "@/hooks/use-practice-history-recorder";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { validatePracticeSession } from "@/lib/persistence-validation";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import type { AudioEngineStatus } from "@/types/audio";
import type { PracticeSession } from "@/types/persistence";
import type { GuidedPracticeConfiguration } from "@/types/practice";

interface RecorderProps {
  bpm: number;
  guidedPractice: GuidedPracticeConfiguration;
  status: AudioEngineStatus;
}

function useRecorder(
  props: RecorderProps,
  onSaveError: () => void,
  onSaveSuccess: () => void = vi.fn(),
) {
  usePracticeHistoryRecorder({
    ...props,
    onSaveError,
    onSaveSuccess,
    pattern: basicRockPattern,
  });
}

describe("practice history recorder", () => {
  const systemTime = Date.parse("2026-07-18T12:00:00.000Z");
  let now = 0;
  const record = vi.fn<(session: PracticeSession) => Promise<void>>();
  const onSaveError = vi.fn();
  const onSaveSuccess = vi.fn();

  function setElapsed(milliseconds: number): void {
    now = milliseconds;
    vi.setSystemTime(systemTime + milliseconds);
  }

  beforeEach(() => {
    now = 0;
    record.mockReset().mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(systemTime);
    vi.spyOn(performance, "now").mockImplementation(() => now);
    guidanceTimeline.reset();
    useHistorySettingsStore.setState({
      ...defaultHistorySettings,
      enabled: true,
      hasHydrated: true,
      minimumDurationSeconds: 30,
    });
    usePracticeHistoryStore.setState({ record });
    onSaveError.mockReset();
    onSaveSuccess.mockReset();
  });

  afterEach(() => {
    guidanceTimeline.reset();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects sessions shorter than the configured threshold", async () => {
    const { rerender } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError),
      {
        initialProps: {
          bpm: 90,
          guidedPractice: { mode: "drums" },
          status: "not-initialized",
        },
      },
    );

    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "playing" });
    setElapsed(29_999);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).not.toHaveBeenCalled();
  });

  it("checks raw active milliseconds before creating integer duration", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 1 });
    const { rerender } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError),
      {
        initialProps: {
          bpm: 90,
          guidedPractice: { mode: "drums" },
          status: "playing",
        },
      },
    );

    setElapsed(999);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });
    expect(record).not.toHaveBeenCalled();

    setElapsed(2_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "playing" });
    setElapsed(3_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).toHaveBeenCalledOnce();
    expect(record.mock.calls[0]![0].durationSeconds).toBe(1);
    expect(validatePracticeSession(record.mock.calls[0]![0]).success).toBe(
      true,
    );
  });

  it("excludes count-in and paused time and saves on stop", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 1 });
    const { rerender } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError),
      {
        initialProps: {
          bpm: 90,
          guidedPractice: { mode: "drums" },
          status: "not-initialized",
        },
      },
    );

    rerender({
      bpm: 90,
      guidedPractice: { mode: "drums" },
      status: "counting-in",
    });
    setElapsed(10_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "paused" });
    setElapsed(50_000);
    rerender({ bpm: 94, guidedPractice: { mode: "drums" }, status: "playing" });
    setElapsed(53_000);
    rerender({
      bpm: 95,
      guidedPractice: { mode: "drums" },
      status: "suspended",
    });
    setElapsed(54_000);
    rerender({ bpm: 95, guidedPractice: { mode: "drums" }, status: "playing" });
    setElapsed(56_900);
    rerender({ bpm: 96, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: 5,
        endingBpm: 96,
        patternName: "Basic Rock",
        practiceMode: "drums",
        startingBpm: 94,
        timeSignature: "4/4",
      }),
    );
    expect(validatePracticeSession(record.mock.calls[0]![0]).success).toBe(
      true,
    );
  });

  it("does not save when history is disabled", async () => {
    useHistorySettingsStore.setState({
      enabled: false,
      minimumDurationSeconds: 1,
    });
    const { rerender } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError),
      {
        initialProps: {
          bpm: 90,
          guidedPractice: { mode: "drums" },
          status: "playing",
        },
      },
    );
    setElapsed(60_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).not.toHaveBeenCalled();
  });

  it("uses the latest trainer guidance when auto-stop changes status", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 1 });
    const guidedPractice: GuidedPracticeConfiguration = {
      mode: "tempoTrainer",
      tempoTrainer: {
        endBpm: 120,
        increment: 5,
        interval: { measures: 1, type: "measures" },
        resetToStartingBpmOnStop: true,
        startBpm: 90,
        stopAtTarget: true,
      },
    };
    const { rerender } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError),
      { initialProps: { bpm: 100, guidedPractice, status: "playing" } },
    );
    guidanceTimeline.begin();
    act(() => {
      guidanceTimeline.publish({
        absoluteSixteenth: 16,
        elapsedSeconds: 8,
        measure: 2,
        mode: "tempoTrainer",
        position: {
          completedIntervals: 6,
          currentBpm: 120,
          isAtTarget: true,
          measuresUntilChange: null,
          nextBpm: null,
          progress: 1,
          secondsUntilChange: null,
          shouldStop: true,
        },
      });
    });
    setElapsed(8_000);
    rerender({ bpm: 100, guidedPractice, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ endingBpm: 120, startingBpm: 90 }),
    );
  });

  it("checkpoints hidden pages without ending the live session", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 1 });
    const visibilityState = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    const { rerender, unmount } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError),
      {
        initialProps: {
          bpm: 90,
          guidedPractice: { mode: "drums" },
          status: "playing",
        },
      },
    );

    setElapsed(2_000);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(record).not.toHaveBeenCalled();

    visibilityState.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    setElapsed(4_000);
    act(() => window.dispatchEvent(new Event("pagehide")));
    setElapsed(6_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });
    unmount();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const snapshots = record.mock.calls.map(([session]) => session);
    expect(snapshots.map(({ durationSeconds }) => durationSeconds)).toEqual([
      2, 4, 6,
    ]);
    expect(new Set(snapshots.map(({ id }) => id)).size).toBe(1);
    expect(new Set(snapshots.map(({ startedAt }) => startedAt)).size).toBe(1);
    expect(
      snapshots.every((session) => validatePracticeSession(session).success),
    ).toBe(true);
  });

  it("best-effort finalizes an active session on unmount", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 1 });
    const { unmount } = renderHook(() =>
      useRecorder(
        { bpm: 90, guidedPractice: { mode: "drums" }, status: "playing" },
        onSaveError,
      ),
    );
    setElapsed(4_000);
    unmount();

    await act(async () => Promise.resolve());
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 4 }),
    );
  });

  it("reports save failures without throwing through playback", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 1 });
    record.mockRejectedValue(new Error("database unavailable"));
    const { rerender } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError),
      {
        initialProps: {
          bpm: 90,
          guidedPractice: { mode: "drums" },
          status: "playing",
        },
      },
    );
    setElapsed(2_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onSaveError).toHaveBeenCalledOnce();
  });

  it("reports a later successful save so stale notices can clear", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 1 });
    record
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(undefined);
    const { rerender } = renderHook(
      (props: RecorderProps) => useRecorder(props, onSaveError, onSaveSuccess),
      {
        initialProps: {
          bpm: 90,
          guidedPractice: { mode: "drums" },
          status: "playing",
        },
      },
    );
    setElapsed(2_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });
    await act(async () => Promise.resolve());
    expect(onSaveError).toHaveBeenCalledOnce();

    setElapsed(3_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "playing" });
    setElapsed(5_000);
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });
    await act(async () => Promise.resolve());

    expect(onSaveSuccess).toHaveBeenCalledOnce();
  });
});
