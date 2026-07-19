import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { visualTimeline } from "@/audio/visual-timeline";
import { basicRockPattern } from "@/data/patterns/rock";
import { useEditorPlayback } from "@/hooks/use-editor-playback";
import { useAudioStore } from "@/stores/audio-store";
import type { CustomDrumPattern } from "@/types/persistence";

const audioEngineMocks = vi.hoisted(() => ({
  changePattern: vi.fn(() => true),
  dispose: vi.fn(),
  play: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: audioEngineMocks.dispose,
  getAudioEngine: () => audioEngineMocks,
}));

const pattern: CustomDrumPattern = {
  ...structuredClone(basicRockPattern),
  bars: 2,
  createdAt: "2026-07-19T10:00:00.000Z",
  id: "editor-playback-test",
  isBuiltIn: false,
  name: "Editor playback test",
  updatedAt: "2026-07-19T10:00:00.000Z",
};

describe("useEditorPlayback visual consumer", () => {
  beforeEach(() => {
    visualTimeline.reset();
    useAudioStore.setState({ errorMessage: null, status: "playing" });
    audioEngineMocks.changePattern.mockClear().mockReturnValue(true);
    audioEngineMocks.dispose.mockClear();
  });

  afterEach(() => {
    visualTimeline.reset();
  });

  it("uses the native pattern step instead of the canonical sixteenth", () => {
    const { result } = renderHook(() => useEditorPlayback(pattern));

    act(() => {
      visualTimeline.emit({
        isAccent: false,
        measure: 1,
        patternStep: 0,
        phase: "pattern",
        sixteenth: 1,
      });
    });
    expect(result.current.activeStep).toBe(0);

    act(() => {
      visualTimeline.emit({
        isAccent: false,
        measure: 2,
        patternStep: 1,
        phase: "pattern",
        sixteenth: 2,
      });
    });
    expect(result.current.activeStep).toBe(9);
  });

  it("restores retained playback state for a late editor subscriber", () => {
    visualTimeline.emit({
      isAccent: false,
      measure: 1,
      patternStep: 3,
      phase: "pattern",
      sixteenth: 7,
    });

    const { result } = renderHook(() => useEditorPlayback(pattern));

    expect(result.current.activeStep).toBe(3);
    act(() => {
      visualTimeline.reset();
    });
    expect(result.current.activeStep).toBeNull();
  });
});
