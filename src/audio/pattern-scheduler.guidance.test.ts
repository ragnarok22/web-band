import {
  FakeAudioRuntime,
  schedulerOptions,
} from "./pattern-scheduler.test-support";
import { describe, expect, it, vi } from "vitest";
import { PatternScheduler } from "@/audio/pattern-scheduler";
import { GuidanceTimeline } from "@/audio/guidance-timeline";
import { VisualTimeline } from "@/audio/visual-timeline";
import { basicRockPattern } from "@/data/patterns/rock";
import { basicPopPattern } from "@/data/strumming-patterns";
import type { GuidanceFrame } from "@/types/practice";

describe("pattern scheduler — guidance", () => {
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
    runtime.repeats[0]?.callback(1, 0);
    runtime.repeats[0]?.callback(2, 4);
    expect(guidedTimeline.getSnapshot()).toBeNull();
    runtime.repeats[1]?.callback(3, 16);
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
      guidedPractice: { mode: "strumming", strummingPattern: basicPopPattern },
    });
    const callback = runtime.repeats[0]?.callback;
    for (let step = 0; step < 16; step += 1) {
      callback?.(step / 10, step);
    }
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
    for (let step = 0; step <= 16; step += 1) {
      callback?.(10 + step / 4, step);
    }
    expect(runtime.scheduledBpmChanges).toEqual([{ bpm: 62, time: 14 }]);
  });

  it("retains delivered guidance across visual cancellation and resets it on clear", () => {
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
    for (let step = 0; step < 4; step += 1) callback?.(step, step);
    expect(guidedTimeline.getSnapshot()).toMatchObject({
      absoluteSixteenth: 3,
    });
    scheduler.cancelPendingVisuals();
    runtime.drawCallbacks.forEach((draw) => draw());
    expect(guidedTimeline.getSnapshot()).toMatchObject({
      absoluteSixteenth: 3,
    });
    runtime.deferDraws = false;
    callback?.(4, 4);
    expect(guidedTimeline.getSnapshot()).toMatchObject({
      absoluteSixteenth: 4,
    });
    scheduler.clear();
    expect(guidedTimeline.getSnapshot()).toBeNull();
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    runtime.repeats.at(-1)?.callback(5, 0);
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
    callback?.(0, 0);
    scheduler.changePattern(
      { ...basicRockPattern, id: "guided-next", name: "Guided next" },
      vi.fn(),
    );
    for (let step = 1; step <= 16; step += 1) callback?.(step, step);
    expect(frames.map((frame) => frame.absoluteSixteenth)).toEqual(
      Array.from({ length: 17 }, (_, index) => index),
    );
  });
});
