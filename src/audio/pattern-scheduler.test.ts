import { describe, expect, it, vi } from "vitest";

import type {
  AudioRuntime,
  RuntimeCallback,
  RuntimeTransportState,
} from "@/audio/audio-runtime";
import {
  PatternScheduler,
  type PatternInstrumentPlayer,
} from "@/audio/pattern-scheduler";
import { VisualTimeline } from "@/audio/visual-timeline";
import { basicRockPattern } from "@/data/patterns/rock";

interface ScheduledRepeat {
  callback: RuntimeCallback;
  duration?: string;
  interval: string;
  startTime?: string | number;
}

class FakeAudioRuntime implements AudioRuntime {
  readonly cleared: number[] = [];
  readonly repeats: ScheduledRepeat[] = [];
  bpm = 90;
  state: RuntimeTransportState = "stopped";

  addContextStateListener(): () => void {
    return () => undefined;
  }
  cancelDraw(): void {}
  clearSchedule(scheduleId: number): void {
    this.cleared.push(scheduleId);
  }
  getContext(): BaseAudioContext {
    throw new Error("Not used by the scheduler test.");
  }
  getContextState(): AudioContextState {
    return "running";
  }
  getTransportState(): RuntimeTransportState {
    return this.state;
  }
  pauseTransport(): void {
    this.state = "paused";
  }
  resetTransport(): void {}
  scheduleDraw(callback: () => void): void {
    callback();
  }
  scheduleRepeat(
    callback: RuntimeCallback,
    interval: string,
    startTime?: string | number,
    duration?: string,
  ): number {
    this.repeats.push({ callback, duration, interval, startTime });
    return this.repeats.length;
  }
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }
  setTimeSignature(): void {}
  async startAudio(): Promise<void> {}
  startTransport(): void {
    this.state = "started";
  }
  stopTransport(): void {
    this.state = "stopped";
  }
}

describe("pattern scheduler", () => {
  it("schedules one measure of count-in before the Basic Rock loop", () => {
    const runtime = new FakeAudioRuntime();
    const instruments: PatternInstrumentPlayer = {
      trigger: vi.fn(),
      triggerCountIn: vi.fn(),
    };
    const timeline = new VisualTimeline();
    const visuals = vi.fn();
    timeline.subscribe(visuals);
    const onPatternStarted = vi.fn();
    const scheduler = new PatternScheduler(runtime, instruments, timeline);

    scheduler.schedule(basicRockPattern, { onPatternStarted });

    expect(runtime.repeats).toHaveLength(2);
    expect(runtime.repeats[0]).toMatchObject({
      duration: "1m",
      interval: "4n",
      startTime: 0,
    });
    expect(runtime.repeats[1]).toMatchObject({
      interval: "16n",
      startTime: "1m",
    });

    runtime.repeats[0]?.callback(1);
    expect(instruments.triggerCountIn).toHaveBeenCalledWith(1, true);

    runtime.repeats[1]?.callback(2);
    expect(instruments.trigger).toHaveBeenCalledWith("closedHat", 2, 0.72);
    expect(instruments.trigger).toHaveBeenCalledWith("kick", 2, 1);
    expect(onPatternStarted).toHaveBeenCalledOnce();
    expect(visuals).toHaveBeenLastCalledWith({
      isAccent: true,
      measure: 1,
      phase: "pattern",
      step: 0,
    });
  });

  it("clears every owned Tone schedule before rebuilding", () => {
    const runtime = new FakeAudioRuntime();
    const instruments: PatternInstrumentPlayer = {
      trigger: vi.fn(),
      triggerCountIn: vi.fn(),
    };
    const scheduler = new PatternScheduler(
      runtime,
      instruments,
      new VisualTimeline(),
    );

    scheduler.schedule(basicRockPattern, { onPatternStarted: vi.fn() });
    scheduler.schedule(basicRockPattern, { onPatternStarted: vi.fn() });

    expect(runtime.cleared).toEqual([1, 2]);
  });

  it("applies a queued pattern at the next measure boundary", () => {
    const runtime = new FakeAudioRuntime();
    const instruments: PatternInstrumentPlayer = {
      trigger: vi.fn(),
      triggerCountIn: vi.fn(),
    };
    const scheduler = new PatternScheduler(
      runtime,
      instruments,
      new VisualTimeline(),
    );
    const nextPattern = {
      ...basicRockPattern,
      hits: basicRockPattern.hits.map((hit) => ({
        ...hit,
        id: `next-${hit.id}`,
      })),
      id: "next-rock",
      name: "Next Rock",
    };
    const onPatternChanged = vi.fn();

    scheduler.schedule(basicRockPattern, { onPatternStarted: vi.fn() });
    const patternCallback = runtime.repeats[1]?.callback;
    patternCallback?.(1);
    scheduler.changePattern(nextPattern, onPatternChanged);

    for (let step = 1; step < 16; step += 1) {
      patternCallback?.(1 + step / 10);
      expect(onPatternChanged).not.toHaveBeenCalled();
    }

    patternCallback?.(3);
    expect(onPatternChanged).toHaveBeenCalledWith(nextPattern);
  });
});
