import {
  FakeAudioRuntime,
  schedulerOptions,
} from "./pattern-scheduler.test-support";
import { describe, expect, it, vi } from "vitest";
import { PatternScheduler } from "@/audio/pattern-scheduler";
import { GuidanceTimeline } from "@/audio/guidance-timeline";
import { VisualTimeline } from "@/audio/visual-timeline";
import { basicRockPattern } from "@/data/patterns/rock";
import type { GuidanceFrame } from "@/types/practice";

describe("pattern scheduler — tempo-trainer", () => {
  it("signals target stop once from the audible context callback", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferCallbacks = true;
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
    for (let step = 0; step <= 20; step += 1) callback?.(step, step);
    expect(onTargetStop).not.toHaveBeenCalled();
    runtime.semanticCallbacks.forEach(({ callback: deliver }) => deliver());
    expect(onTargetStop).toHaveBeenCalledOnce();
    runtime.drawCallbacks.forEach((draw) => draw());
    expect(onTargetStop).toHaveBeenCalledOnce();
  });

  it("delivers target stop without depending on visual Draw callbacks", () => {
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
    for (let step = 0; step <= 16; step += 1) {
      callback?.(step / 4, step);
    }
    expect(onTargetStop).toHaveBeenCalledOnce();
  });

  it("publishes target guidance without scheduling the target downbeat", () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferCallbacks = true;
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
    for (let step = 0; step < 16; step += 1) {
      callback?.(step / 4, step);
    }
    trigger.mockClear();
    callback?.(4, 16);
    expect(trigger).not.toHaveBeenCalled();
    expect(onTargetStop).not.toHaveBeenCalled();
    runtime.semanticCallbacks.forEach(({ callback: deliver }) => deliver());
    expect(frames.at(-1)).toMatchObject({
      absoluteSixteenth: 16,
      position: { currentBpm: 62, isAtTarget: true },
    });
    expect(onTargetStop).toHaveBeenCalledOnce();
    runtime.drawCallbacks.forEach((draw) => draw());
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
});
