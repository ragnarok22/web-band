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
import { GuidanceTimeline } from "@/audio/guidance-timeline";
import { VisualTimeline } from "@/audio/visual-timeline";
import { basicRockPattern } from "@/data/patterns/rock";
import { utilityPatterns } from "@/data/patterns/utility";
import { basicPopPattern } from "@/data/strumming-patterns";
import type { GuidanceFrame } from "@/types/practice";

function schedulerOptions(
  onPatternStarted = vi.fn(),
  countInMeasures: 0 | 1 | 2 | 4 = 1,
) {
  return {
    bpm: 90,
    countInMeasures,
    fillFrequency: null,
    guidedPractice: { mode: "drums" },
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
  readonly scheduledBpmChanges: Array<{ bpm: number; time: number }> = [];
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
  setBpmAtTime(bpm: number, time: number): void {
    this.bpm = bpm;
    this.scheduledBpmChanges.push({ bpm, time });
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
    const guidedTimeline = new GuidanceTimeline();
    const visuals = vi.fn();
    timeline.subscribe(visuals);
    const onPatternStarted = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      instruments,
      timeline,
      Math.random,
      guidedTimeline,
    );

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
    const guidedTimeline = new GuidanceTimeline();
    const visuals = vi.fn();
    timeline.subscribe(visuals);
    const onPatternStarted = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      instruments,
      timeline,
      Math.random,
      guidedTimeline,
    );

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
    expect(guidedTimeline.getSnapshot()).toBeNull();
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

  it("does not advance guidance during count-in", () => {
    const runtime = new FakeAudioRuntime();
    const guidedTimeline = new GuidanceTimeline();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
      Math.random,
      guidedTimeline,
    );
    scheduler.schedule(basicRockPattern, schedulerOptions());

    runtime.repeats[0]?.callback(1);
    runtime.repeats[0]?.callback(2);
    expect(guidedTimeline.getSnapshot()).toBeNull();

    runtime.repeats[1]?.callback(3);
    expect(guidedTimeline.getSnapshot()).toMatchObject({
      absoluteSixteenth: 0,
      elapsedSeconds: 0,
      measure: 1,
    });
  });

  it("publishes all sixteenth strum ticks over an eighth-note drum pattern", () => {
    const runtime = new FakeAudioRuntime();
    const guidedTimeline = new GuidanceTimeline();
    const frames: GuidanceFrame[] = [];
    guidedTimeline.subscribe((frame) => {
      if (frame) frames.push(frame);
    });
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
      Math.random,
      guidedTimeline,
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      guidedPractice: {
        mode: "strumming",
        strummingPattern: basicPopPattern,
      },
    });

    const callback = runtime.repeats[0]?.callback;
    for (let step = 0; step < 16; step += 1) callback?.(step / 10);

    expect(
      frames.map((frame) =>
        frame.mode === "strumming" ? frame.position.stepIndex : -1,
      ),
    ).toEqual(Array.from({ length: 16 }, (_, index) => index));
  });

  it("sets tempo changes exactly at the scheduler callback time", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      bpm: 120,
      guidedPractice: {
        mode: "tempoTrainer",
        tempoTrainer: {
          endBpm: 64,
          increment: 2,
          interval: { measures: 1, type: "measures" },
          resetToStartingBpmOnStop: false,
          startBpm: 60,
          stopAtTarget: false,
        },
      },
    });

    const callback = runtime.repeats[0]?.callback;
    for (let step = 0; step <= 16; step += 1) callback?.(10 + step / 4);

    expect(runtime.scheduledBpmChanges).toEqual([{ bpm: 62, time: 14 }]);
  });

  it("retains guided state across visual cancellation and resets it on clear", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferDraws = true;
    const guidedTimeline = new GuidanceTimeline();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
      Math.random,
      guidedTimeline,
    );
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    const callback = runtime.repeats[0]?.callback;

    for (let step = 0; step < 4; step += 1) callback?.(step);
    scheduler.cancelPendingVisuals();
    runtime.drawCallbacks.forEach((draw) => draw());
    expect(guidedTimeline.getSnapshot()).toBeNull();

    runtime.deferDraws = false;
    callback?.(4);
    expect(guidedTimeline.getSnapshot()).toMatchObject({
      absoluteSixteenth: 4,
    });
    scheduler.clear();
    expect(guidedTimeline.getSnapshot()).toBeNull();

    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    runtime.repeats.at(-1)?.callback(5);
    expect(guidedTimeline.getSnapshot()).toMatchObject({
      absoluteSixteenth: 0,
    });
  });

  it("keeps guidance continuous when the drum pattern cursor resets", () => {
    const runtime = new FakeAudioRuntime();
    const guidedTimeline = new GuidanceTimeline();
    const frames: GuidanceFrame[] = [];
    guidedTimeline.subscribe((frame) => {
      if (frame) frames.push(frame);
    });
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
      Math.random,
      guidedTimeline,
    );
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    const callback = runtime.repeats[0]?.callback;
    callback?.(0);
    scheduler.changePattern(
      { ...basicRockPattern, id: "guided-next", name: "Guided next" },
      vi.fn(),
    );
    for (let step = 1; step <= 16; step += 1) callback?.(step);

    expect(frames.map((frame) => frame.absoluteSixteenth)).toEqual(
      Array.from({ length: 17 }, (_, index) => index),
    );
  });

  it("signals target stop once from an audible Draw callback", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferDraws = true;
    const onTargetStop = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      guidedPractice: {
        mode: "tempoTrainer",
        tempoTrainer: {
          endBpm: 62,
          increment: 2,
          interval: { measures: 1, type: "measures" },
          resetToStartingBpmOnStop: false,
          startBpm: 60,
          stopAtTarget: true,
        },
      },
      onTargetStop,
    });
    const callback = runtime.repeats[0]?.callback;
    for (let step = 0; step <= 20; step += 1) callback?.(step);

    expect(onTargetStop).not.toHaveBeenCalled();
    runtime.drawCallbacks.forEach((draw) => draw());
    expect(onTargetStop).toHaveBeenCalledOnce();
  });

  it("publishes target guidance without scheduling the target downbeat", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferDraws = true;
    const trigger = vi.fn();
    const onTargetStop = vi.fn();
    const guidedTimeline = new GuidanceTimeline();
    const frames: GuidanceFrame[] = [];
    guidedTimeline.subscribe((frame) => {
      if (frame) frames.push(frame);
    });
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
      Math.random,
      guidedTimeline,
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      guidedPractice: {
        mode: "tempoTrainer",
        tempoTrainer: {
          endBpm: 62,
          increment: 2,
          interval: { measures: 1, type: "measures" },
          resetToStartingBpmOnStop: false,
          startBpm: 60,
          stopAtTarget: true,
        },
      },
      onTargetStop,
    });
    const callback = runtime.repeats[0]?.callback;
    for (let step = 0; step < 16; step += 1) callback?.(step / 4);
    trigger.mockClear();

    callback?.(4);

    expect(trigger).not.toHaveBeenCalled();
    expect(onTargetStop).not.toHaveBeenCalled();
    runtime.drawCallbacks.forEach((draw) => draw());
    expect(frames.at(-1)).toMatchObject({
      absoluteSixteenth: 16,
      position: { currentBpm: 62, isAtTarget: true },
    });
    expect(onTargetStop).toHaveBeenCalledOnce();
  });

  it("rejects equal tempo trainer endpoints before scheduling playback", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );

    expect(() =>
      scheduler.schedule(basicRockPattern, {
        ...schedulerOptions(),
        guidedPractice: {
          mode: "tempoTrainer",
          tempoTrainer: {
            endBpm: 90,
            increment: 2,
            interval: { measures: 1, type: "measures" },
            resetToStartingBpmOnStop: false,
            startBpm: 90,
            stopAtTarget: true,
          },
        },
      }),
    ).toThrow("must be different");
    expect(runtime.repeats).toHaveLength(0);
  });

  it("rejects only immediate cross-meter pattern changes while active", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    const onPatternChanged = vi.fn();
    const sameMeterPattern = {
      ...basicRockPattern,
      id: "same-meter-rock",
      name: "Same meter rock",
    };
    const sixEightPattern = utilityPatterns.find(
      (pattern) => pattern.id === "simple-six-eight",
    );
    expect(sixEightPattern).toBeDefined();
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));

    expect(
      scheduler.changePattern(sixEightPattern!, onPatternChanged, true),
    ).toBe(false);
    expect(onPatternChanged).not.toHaveBeenCalled();
    expect(
      scheduler.changePattern(sameMeterPattern, onPatternChanged, true),
    ).toBe(true);
    expect(onPatternChanged).toHaveBeenCalledWith(sameMeterPattern);
  });

  it("rejects incompatible guided meter changes without applying them", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      guidedPractice: {
        chordTrainer: {
          progression: {
            id: "meter-chord",
            isBuiltIn: false,
            name: "Meter chord",
            steps: [
              {
                chord: "C",
                duration: 1,
                durationUnit: "measures",
                id: "c",
              },
            ],
          },
          repeat: true,
          showCountdown: false,
        },
        mode: "chords",
      },
    });
    const onPatternChanged = vi.fn();
    const sixEightPattern = utilityPatterns.find(
      (pattern) => pattern.id === "simple-six-eight",
    );
    expect(sixEightPattern).toBeDefined();

    expect(scheduler.changePattern(sixEightPattern!, onPatternChanged)).toBe(
      false,
    );
    for (let step = 0; step <= 16; step += 1) {
      runtime.repeats[0]?.callback(step);
    }
    expect(onPatternChanged).not.toHaveBeenCalled();
  });
});
