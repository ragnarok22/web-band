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
import { utilityPatterns } from "@/data/patterns/utility";

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
    runtime.repeats[0]?.callback(1, 0);
    expect(instruments.triggerCountIn).toHaveBeenCalledWith(1, true);
    expect(visuals).toHaveBeenLastCalledWith({
      beat: 0,
      isAccent: true,
      measure: 1,
      phase: "count-in",
    });
    runtime.repeats[1]?.callback(2, 16);
    expect(instruments.trigger).toHaveBeenCalledWith("closedHat", 2, 0.72);
    expect(instruments.trigger).toHaveBeenCalledWith("kick", 2, 1);
    expect(onPatternStarted).toHaveBeenCalledOnce();
    expect(visuals).toHaveBeenLastCalledWith({
      isAccent: true,
      measure: 1,
      patternStep: 0,
      phase: "pattern",
      sixteenth: 0,
    });
  });

  it.each([
    {
      countInInterval: "4n",
      denominator: 4,
      id: "simple-two-four",
      numerator: 2,
      sixteenthsPerBar: 8,
    },
    {
      countInInterval: "4n",
      denominator: 4,
      id: "simple-five-four",
      numerator: 5,
      sixteenthsPerBar: 20,
    },
    {
      countInInterval: "8n",
      denominator: 8,
      id: "simple-seven-eight",
      numerator: 7,
      sixteenthsPerBar: 14,
    },
    {
      countInInterval: "8n",
      denominator: 8,
      id: "basic-jazz-ride",
      numerator: 12,
      sixteenthsPerBar: 24,
    },
  ])(
    "schedules and rolls over the $id meter directly",
    ({ countInInterval, denominator, id, numerator, sixteenthsPerBar }) => {
      const pattern = utilityPatterns.find((candidate) => candidate.id === id);
      if (!pattern) throw new Error(`Missing utility pattern: ${id}`);
      const runtime = new FakeAudioRuntime();
      const instruments: PatternInstrumentPlayer = {
        trigger: vi.fn(),
        triggerCountIn: vi.fn(),
      };
      const timeline = new VisualTimeline();
      const visuals = vi.fn();
      timeline.subscribe(visuals);
      const scheduler = new PatternScheduler(
        runtime,
        instruments,
        timeline,
        () => 1,
      );
      scheduler.schedule(pattern, schedulerOptions());
      expect(runtime.timeSignatureCalls).toEqual([{ denominator, numerator }]);
      expect(runtime.repeats[0]).toMatchObject({
        duration: "1m",
        interval: countInInterval,
        startTime: 0,
      });
      expect(runtime.repeats[1]).toMatchObject({
        interval: "16n",
        startTime: "1m",
      });
      const sixteenthsPerBeat = 16 / denominator;
      runtime.repeats[0]?.callback(1, (numerator - 1) * sixteenthsPerBeat);
      expect(instruments.triggerCountIn).toHaveBeenCalledWith(1, false);
      expect(visuals).toHaveBeenLastCalledWith({
        beat: numerator - 1,
        isAccent: false,
        measure: 1,
        phase: "count-in",
      });
      for (let offset = 0; offset <= sixteenthsPerBar; offset += 1) {
        runtime.repeats[1]?.callback(
          2 + offset / 100,
          sixteenthsPerBar + offset,
        );
      }
      expect(visuals).toHaveBeenLastCalledWith({
        isAccent: expect.any(Boolean),
        measure: 2,
        patternStep: 0,
        phase: "pattern",
        sixteenth: 0,
      });
    },
  );

  it("starts immediately when count-in is disabled", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    expect(runtime.repeats).toHaveLength(1);
    expect(runtime.repeats[0]).toMatchObject({ interval: "16n", startTime: 0 });
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
    expect(runtime.repeats[0]).toMatchObject({ duration: "4m", startTime: 0 });
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
    callback?.(1, 0);
    callback?.(2, 1);
    callback?.(3, 2);
    const nonDownbeatCall = trigger.mock.calls.find(([, time]) => time > 3);
    expect(nonDownbeatCall?.[1]).toBeLessThanOrEqual(3.01);
    expect(nonDownbeatCall?.[2]).toBeLessThanOrEqual(1);
  });

  it("schedules a bounded second hit for flam metadata", () => {
    const runtime = new FakeAudioRuntime();
    const trigger = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    const flamPattern = {
      ...basicRockPattern,
      hits: [
        { ...basicRockPattern.hits[0]!, flam: true, id: "flam-hit", step: 0 },
      ],
      id: "flam-pattern",
      name: "Flam pattern",
    };
    scheduler.schedule(flamPattern, schedulerOptions(vi.fn(), 0));
    runtime.repeats[0]?.callback(5, 0);
    expect(trigger).toHaveBeenCalledTimes(2);
    expect(trigger.mock.calls[0]).toEqual([
      flamPattern.hits[0].instrument,
      5,
      flamPattern.hits[0].velocity,
    ]);
    expect(trigger.mock.calls[1]?.[0]).toBe(flamPattern.hits[0].instrument);
    expect(trigger.mock.calls[1]?.[1]).toBeGreaterThan(5);
    expect(trigger.mock.calls[1]?.[1]).toBeLessThanOrEqual(5.04);
    expect(trigger.mock.calls[1]?.[2]).toBeGreaterThan(0);
    expect(trigger.mock.calls[1]?.[2]).toBeLessThanOrEqual(
      flamPattern.hits[0].velocity,
    );
  });

  it("never schedules a zero-probability hit when random returns zero", () => {
    const runtime = new FakeAudioRuntime();
    const trigger = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
      () => 0,
    );
    const silentPattern = {
      ...basicRockPattern,
      hits: [
        {
          ...basicRockPattern.hits[0]!,
          id: "zero-probability-hit",
          probability: 0,
          step: 0,
        },
      ],
      id: "zero-probability-pattern",
      name: "Zero probability pattern",
    };
    scheduler.schedule(silentPattern, schedulerOptions(vi.fn(), 0));
    runtime.repeats[0]?.callback(5, 0);
    expect(trigger).not.toHaveBeenCalled();
  });
});
