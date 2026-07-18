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

function schedulerOptions(
  onPatternStarted = vi.fn(),
  countInMeasures: 0 | 1 | 2 | 4 = 1,
) {
  return {
    countInMeasures,
    fillFrequency: null,
    humanization: 0,
    onPatternStarted,
    swing: 0,
  } as const;
}

interface ScheduledRepeat {
  callback: RuntimeCallback;
  duration?: string;
  interval: string;
  startTime?: string | number;
}

class FakeAudioRuntime implements AudioRuntime {
  readonly cleared: number[] = [];
  readonly drawCallbacks: Array<() => void> = [];
  readonly repeats: ScheduledRepeat[] = [];
  readonly swingCalls: Array<{ amount: number; subdivision: "8n" | "16n" }> =
    [];
  bpm = 90;
  deferDraws = false;
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
    if (this.deferDraws) {
      this.drawCallbacks.push(callback);
    } else {
      callback();
    }
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
  setSwing(amount: number, subdivision: "8n" | "16n"): void {
    this.swingCalls.push({ amount, subdivision });
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

    scheduler.schedule(basicRockPattern, schedulerOptions(onPatternStarted));

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

    scheduler.schedule(basicRockPattern, schedulerOptions());
    scheduler.schedule(basicRockPattern, schedulerOptions());

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

    scheduler.schedule(basicRockPattern, schedulerOptions());
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

  it("ignores transport and draw callbacks after clear", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferDraws = true;
    const instruments: PatternInstrumentPlayer = {
      trigger: vi.fn(),
      triggerCountIn: vi.fn(),
    };
    const timeline = new VisualTimeline();
    const visuals = vi.fn();
    timeline.subscribe(visuals);
    const onPatternStarted = vi.fn();
    const scheduler = new PatternScheduler(runtime, instruments, timeline);

    scheduler.schedule(basicRockPattern, schedulerOptions(onPatternStarted));
    const countInCallback = runtime.repeats[0]?.callback;
    const patternCallback = runtime.repeats[1]?.callback;
    patternCallback?.(1);
    scheduler.clear();
    countInCallback?.(2);
    patternCallback?.(3);
    runtime.drawCallbacks.forEach((callback) => callback());

    expect(instruments.triggerCountIn).not.toHaveBeenCalled();
    expect(instruments.trigger).toHaveBeenCalledTimes(2);
    expect(onPatternStarted).not.toHaveBeenCalled();
    expect(visuals).not.toHaveBeenCalled();
  });

  it("starts immediately when count-in is disabled", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );

    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));

    expect(runtime.repeats).toHaveLength(1);
    expect(runtime.repeats[0]).toMatchObject({
      interval: "16n",
      startTime: 0,
    });
  });

  it("schedules multiple count-in measures and configures swing", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );

    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 4),
      swing: 0.4,
    });

    expect(runtime.repeats[0]).toMatchObject({
      duration: "4m",
      startTime: 0,
    });
    expect(runtime.repeats[1]).toMatchObject({ startTime: "4m" });
    expect(runtime.swingCalls).toEqual([{ amount: 0.4, subdivision: "8n" }]);
  });

  it("bounds humanized hit timing and velocity", () => {
    const runtime = new FakeAudioRuntime();
    const trigger = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
      () => 1,
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      humanization: 1,
    });
    const callback = runtime.repeats[0]?.callback;

    callback?.(1);
    callback?.(2);
    callback?.(3);

    const nonDownbeatCall = trigger.mock.calls.find(([, time]) => time > 3);
    expect(nonDownbeatCall?.[1]).toBeLessThanOrEqual(3.01);
    expect(nonDownbeatCall?.[2]).toBeLessThanOrEqual(1);
  });

  it("keeps the post-fill crash when a pattern change is queued", () => {
    const runtime = new FakeAudioRuntime();
    const trigger = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      fillFrequency: 4,
    });
    const callback = runtime.repeats[0]?.callback;

    for (let step = 0; step < 64; step += 1) callback?.(step / 10);
    scheduler.changePattern(
      { ...basicRockPattern, id: "next-pattern", name: "Next pattern" },
      vi.fn(),
    );
    trigger.mockClear();
    callback?.(7);

    expect(trigger).toHaveBeenCalledWith("crash", 7, 0.9);
  });
});
