import {
  FakeAudioRuntime,
  schedulerOptions,
} from "./pattern-scheduler.test-support";
import { describe, expect, it, vi } from "vitest";
import {
  PatternScheduler,
  type PatternInstrumentPlayer,
} from "@/audio/pattern-scheduler";
import { VisualTimeline } from "@/audio/visual-timeline";
import { basicRockPattern } from "@/data/patterns/rock";
import { utilityPatterns } from "@/data/patterns/utility";

describe("pattern scheduler — transitions", () => {
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
    patternCallback?.(1, 0);
    scheduler.changePattern(nextPattern, onPatternChanged);
    for (let step = 1; step < 16; step += 1) {
      patternCallback?.(1 + step / 10, step);
      expect(onPatternChanged).not.toHaveBeenCalled();
    }
    patternCallback?.(3, 16);
    expect(onPatternChanged).toHaveBeenCalledWith(nextPattern);
  });

  it("forces a transition fill before committing a queued pattern", () => {
    const runtime = new FakeAudioRuntime();
    const trigger = vi.fn();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger, triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    const nextPattern = {
      ...basicRockPattern,
      id: "transition-target",
      name: "Transition target",
    };
    const onPatternChanged = vi.fn();
    scheduler.schedule(basicRockPattern, schedulerOptions(vi.fn(), 0));
    const callback = runtime.repeats[0]?.callback;
    callback?.(0, 0);
    expect(scheduler.changePattern(nextPattern, onPatternChanged, "fill")).toBe(
      true,
    );
    for (let step = 1; step < 32; step += 1) callback?.(step, step);
    expect(onPatternChanged).not.toHaveBeenCalled();
    expect(
      trigger.mock.calls.some(
        ([instrument], index) =>
          index > 0 && ["highTom", "midTom", "lowTom"].includes(instrument),
      ),
    ).toBe(true);
    callback?.(32, 32);
    expect(onPatternChanged).toHaveBeenCalledWith(nextPattern);
    expect(trigger).toHaveBeenCalledWith("crash", 32, 0.9);
  });

  it("adopts a queued pattern's swing at the measure boundary", () => {
    const runtime = new FakeAudioRuntime();
    const scheduler = new PatternScheduler(
      runtime,
      { trigger: vi.fn(), triggerCountIn: vi.fn() },
      new VisualTimeline(),
    );
    const swingPattern = {
      ...basicRockPattern,
      id: "swing-pattern",
      name: "Swing pattern",
      swing: 0.34,
    };
    scheduler.schedule(basicRockPattern, {
      ...schedulerOptions(vi.fn(), 0),
      swing: 0.1,
    });
    const callback = runtime.repeats[0]?.callback;
    callback?.(0, 0);
    scheduler.changePattern(swingPattern, vi.fn());
    for (let step = 1; step <= 16; step += 1) callback?.(step, step);
    expect(runtime.swingCalls.at(-1)).toEqual({
      amount: 0.34,
      subdivision: "8n",
    });
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
    for (let step = 0; step < 64; step += 1) {
      callback?.(step / 10, step);
    }
    scheduler.changePattern(
      { ...basicRockPattern, id: "next-pattern", name: "Next pattern" },
      vi.fn(),
    );
    trigger.mockClear();
    callback?.(7, 64);
    expect(trigger).toHaveBeenCalledWith("crash", 7, 0.9);
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
      scheduler.changePattern(sixEightPattern!, onPatternChanged, "immediate"),
    ).toBe(false);
    expect(onPatternChanged).not.toHaveBeenCalled();
    expect(
      scheduler.changePattern(sameMeterPattern, onPatternChanged, "immediate"),
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
              { chord: "C", duration: 1, durationUnit: "measures", id: "c" },
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
      runtime.repeats[0]?.callback(step, step);
    }
    expect(onPatternChanged).not.toHaveBeenCalled();
  });
});
