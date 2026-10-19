import {
  FakeAudioRuntime,
  schedulerOptions,
} from "./pattern-scheduler.test-support";
import { describe, expect, it, vi } from "vitest";
import {
  PatternScheduler,
  type PatternInstrumentPlayer,
} from "@/audio/pattern-scheduler";
import { GuidanceTimeline } from "@/audio/guidance-timeline";
import { VisualTimeline } from "@/audio/visual-timeline";
import { basicRockPattern } from "@/data/patterns/rock";

describe("pattern scheduler — lifecycle", () => {
  it("advances an eighth-note visual playhead beyond its first native step", () => {
    const runtime = new FakeAudioRuntime();
    const timeline = new VisualTimeline();
    const visuals = vi.fn();
    const instruments: PatternInstrumentPlayer = {
      trigger: vi.fn(),
      triggerCountIn: vi.fn(),
    };
    timeline.subscribe(visuals);
    const scheduler = new PatternScheduler(runtime, instruments, timeline);
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    const callback = runtime.repeats[0]?.callback;
    callback?.(0, 0);
    callback?.(0.1, 1);
    callback?.(0.2, 2);
    expect(visuals).toHaveBeenCalledTimes(3);
    expect(
      visuals.mock.calls.map(([frame]) =>
        frame?.phase === "pattern"
          ? [frame.sixteenth, frame.patternStep]
          : null,
      ),
    ).toEqual([
      [0, 0],
      [1, 0],
      [2, 1],
    ]);
    expect(instruments.trigger).toHaveBeenCalledTimes(3);
    expect(instruments.trigger).toHaveBeenLastCalledWith(
      "closedHat",
      0.2,
      0.48,
    );
  });

  it("retains the last audible visual frame until playback is cleared", () => {
    const runtime = new FakeAudioRuntime();
    const timeline = new VisualTimeline();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      timeline,
    );
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    runtime.repeats[0]?.callback(0, 0);
    runtime.repeats[0]?.callback(0.1, 1);
    const remountedListener = vi.fn();
    timeline.subscribe(remountedListener);
    expect(remountedListener).toHaveBeenCalledOnce();
    expect(remountedListener).toHaveBeenLastCalledWith({
      isAccent: false,
      measure: 1,
      patternStep: 0,
      phase: "pattern",
      sixteenth: 1,
    });
    scheduler.cancelPendingVisuals();
    const pausedRemountListener = vi.fn();
    timeline.subscribe(pausedRemountListener);
    expect(pausedRemountListener).toHaveBeenCalledWith(timeline.getSnapshot());
    scheduler.clear();
    expect(timeline.getSnapshot()).toBeNull();
    expect(remountedListener).toHaveBeenLastCalledWith(null);
    expect(pausedRemountListener).toHaveBeenLastCalledWith(null);
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

  it("queues one bounded fill before stopping at audible time", () => {
    const runtime = new FakeAudioRuntime();
    const trigger = vi.fn();
    const onTargetStop = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      onTargetStop,
    });
    const callback = runtime.repeats[0]?.callback;
    callback?.(0, 0);
    expect(scheduler.queueStopWithFill()).toBe(true);
    for (let step = 1; step < 32; step += 1) callback?.(step, step);
    expect(onTargetStop).not.toHaveBeenCalled();
    const hitCountBeforeStop = trigger.mock.calls.length;
    callback?.(32, 32);
    expect(onTargetStop).toHaveBeenCalledOnce();
    expect(trigger).toHaveBeenCalledTimes(hitCountBeforeStop);
  });

  it("lets immediate clear cancel a queued fill stop", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferCallbacks = true;
    const onTargetStop = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      onTargetStop,
    });
    const callback = runtime.repeats[0]?.callback;
    callback?.(0, 0);
    scheduler.queueStopWithFill();
    for (let step = 1; step <= 32; step += 1) callback?.(step, step);
    const staleCallbacks = [...runtime.semanticCallbacks];
    scheduler.clear();
    staleCallbacks.forEach(({ callback: deliver }) => deliver());
    expect(onTargetStop).not.toHaveBeenCalled();
  });

  it("ignores transport and draw callbacks after clear", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferCallbacks = true;
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
    patternCallback?.(1, 0);
    scheduler.clear();
    countInCallback?.(2, 0);
    patternCallback?.(3, 1);
    runtime.semanticCallbacks.forEach(({ callback }) => callback());
    runtime.drawCallbacks.forEach((callback) => callback());
    expect(instruments.triggerCountIn).not.toHaveBeenCalled();
    expect(instruments.trigger).toHaveBeenCalledTimes(2);
    expect(onPatternStarted).not.toHaveBeenCalled();
    expect(visuals).not.toHaveBeenCalled();
    expect(guidedTimeline.getSnapshot()).toBeNull();
  });

  it("replays a lookahead step after pause without advancing the pattern", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferCallbacks = true;
    runtime.deferDraws = true;
    const trigger = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    const callback = runtime.repeats[0]?.callback as (
      time: number,
      transportSixteenth: number,
    ) => void;
    callback(1, 0);
    scheduler.cancelPendingVisuals();
    callback(2, 0);
    expect(trigger.mock.calls).toEqual([
      ["kick", 1, 1],
      ["closedHat", 1, 0.72],
      ["kick", 2, 1],
      ["closedHat", 2, 0.72],
    ]);
  });
});
