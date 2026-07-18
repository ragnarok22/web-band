import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { basicRockPattern } from "@/data/patterns";
import { usePracticeHistoryRecorder } from "@/hooks/use-practice-history-recorder";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
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

function useRecorder(props: RecorderProps, onSaveError: () => void) {
  usePracticeHistoryRecorder({
    ...props,
    onSaveError,
    pattern: basicRockPattern,
  });
}

describe("practice history recorder", () => {
  let now = 0;
  const record = vi.fn<(session: PracticeSession) => Promise<void>>();
  const onSaveError = vi.fn();

  beforeEach(() => {
    now = 0;
    record.mockReset().mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime("2026-07-18T12:00:00.000Z");
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
    now = 29_999;
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).not.toHaveBeenCalled();
  });

  it("excludes paused time and saves on stop", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 0 });
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
    now = 10_000;
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "paused" });
    now = 50_000;
    rerender({ bpm: 94, guidedPractice: { mode: "drums" }, status: "playing" });
    now = 55_900;
    rerender({ bpm: 96, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: 15,
        endingBpm: 96,
        patternName: "Basic Rock",
        practiceMode: "drums",
        startingBpm: 90,
        timeSignature: "4/4",
      }),
    );
  });

  it("does not save when history is disabled", async () => {
    useHistorySettingsStore.setState({
      enabled: false,
      minimumDurationSeconds: 0,
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
    now = 60_000;
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).not.toHaveBeenCalled();
  });

  it("uses the latest trainer guidance when auto-stop changes status", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 0 });
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
    now = 8_000;
    rerender({ bpm: 100, guidedPractice, status: "stopped" });

    await act(async () => Promise.resolve());
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ endingBpm: 120, startingBpm: 90 }),
    );
  });

  it("best-effort finalizes an active session on unmount", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 0 });
    const { unmount } = renderHook(() =>
      useRecorder(
        { bpm: 90, guidedPractice: { mode: "drums" }, status: "playing" },
        onSaveError,
      ),
    );
    now = 4_000;
    unmount();

    await act(async () => Promise.resolve());
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 4 }),
    );
  });

  it("reports save failures without throwing through playback", async () => {
    useHistorySettingsStore.setState({ minimumDurationSeconds: 0 });
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
    now = 2_000;
    rerender({ bpm: 90, guidedPractice: { mode: "drums" }, status: "stopped" });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onSaveError).toHaveBeenCalledOnce();
  });
});
