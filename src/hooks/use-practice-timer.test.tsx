import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePracticeTimer } from "@/hooks/use-practice-timer";
import type { AudioEngineStatus } from "@/types/audio";

describe("usePracticeTimer", () => {
  let now = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resets when a new session starts after Stop", () => {
    const { rerender, result } = renderHook(
      ({ status }: { status: AudioEngineStatus }) => usePracticeTimer(status),
      { initialProps: { status: "stopped" as AudioEngineStatus } },
    );

    rerender({ status: "playing" });
    now = 1_100;
    act(() => vi.advanceTimersByTime(1_100));
    expect(result.current).toBe(1);

    rerender({ status: "stopped" });
    rerender({ status: "playing" });
    act(() => vi.advanceTimersByTime(0));

    expect(result.current).toBe(0);
  });
});
