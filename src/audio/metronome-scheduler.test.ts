import { describe, expect, it, vi } from "vitest";
import { FakeAudioRuntime } from "./pattern-scheduler.test-support";
import { MetronomeScheduler } from "@/audio/metronome-scheduler";
import { MetronomeTimeline } from "@/audio/metronome-timeline";
import { createDefaultMetronomeConfiguration } from "@/lib/metronome";
import type { MetronomeConfiguration } from "@/types/practice";

function setup(
  changes: Partial<MetronomeConfiguration> = {},
  countInMeasures: 0 | 1 | 2 | 4 = 0,
) {
  const runtime = new FakeAudioRuntime();
  const triggerMetronome = vi.fn();
  const timeline = new MetronomeTimeline();
  const onStarted = vi.fn();
  const onComplete = vi.fn();
  const scheduler = new MetronomeScheduler(
    runtime,
    { triggerMetronome },
    timeline,
  );
  const configuration = {
    ...createDefaultMetronomeConfiguration(),
    ...changes,
  };
  scheduler.schedule(configuration, { countInMeasures, onStarted, onComplete });
  return {
    runtime,
    triggerMetronome,
    timeline,
    scheduler,
    configuration,
    onStarted,
    onComplete,
  };
}

describe("metronome scheduler", () => {
  it("exposes precise expected events, including silent guides, and invalidates paused epochs", () => {
    const { runtime, scheduler, configuration } = setup({
      subdivision: 2,
      subdivisionAudioMode: "pulse-only",
    });
    const listener = vi.fn();
    const unsubscribe = scheduler.subscribeTiming(listener);
    runtime.tickRepeats[0]?.callback(4, 0);
    runtime.tickRepeats[0]?.callback(4.375, 96);
    const first = listener.mock.calls[0]?.[0];
    expect(first).toMatchObject({
      kind: "scheduled",
      audible: true,
      frame: { audioTime: 4, transportTick: 0, beat: 0, subdivisionIndex: 0 },
    });
    expect(listener.mock.calls[1]?.[0]).toMatchObject({
      kind: "scheduled",
      audible: false,
      frame: { audioTime: 4.375, subdivisionIndex: 1 },
    });
    scheduler.pause();
    expect(listener).toHaveBeenLastCalledWith({
      kind: "cancelled",
      epoch: first.epoch,
    });
    expect(() =>
      scheduler.update({ ...configuration, measuresPerStage: 8 }),
    ).toThrow(/Stop playback/);
    unsubscribe();
    const count = listener.mock.calls.length;
    scheduler.clear();
    expect(listener).toHaveBeenCalledTimes(count);
  });

  it("honors custom accents and genuinely mutes zero-volume clicks", () => {
    const { runtime, triggerMetronome, scheduler, configuration } = setup({
      subdivision: 2,
      accentPattern: [false, true, false, true],
    });
    runtime.tickRepeats[0]?.callback(0, 0);
    runtime.tickRepeats[0]?.callback(1, 192);
    expect(triggerMetronome.mock.calls.map(([, kind]) => kind)).toEqual([
      "pulse",
      "accent",
    ]);
    scheduler.update({ ...configuration, metronomeVolume: 0 });
    runtime.tickRepeats[0]?.callback(2, 384);
    expect(triggerMetronome).toHaveBeenCalledTimes(2);
  });
  it.each([1, 2, 3, 4] as const)(
    "schedules %s genuine attacks per pulse at exact audio times",
    (subdivision) => {
      const { runtime, triggerMetronome } = setup({ subdivision });
      // At 80 BPM, a pulse lasts 0.75s. The 12-part lattice represents all tuplets exactly.
      for (let step = 0; step < 48; step++)
        runtime.tickRepeats[0]?.callback((step * 0.75) / 12, step * 16);
      expect(triggerMetronome).toHaveBeenCalledTimes(4 * subdivision);
      triggerMetronome.mock.calls.forEach(([time], index) =>
        expect(time).toBeCloseTo((index * 0.75) / subdivision, 10),
      );
      expect(triggerMetronome.mock.calls[0]?.[1]).toBe("accent");
      expect(triggerMetronome.mock.calls[subdivision]?.[1]).toBe("pulse");
    },
  );

  it("displays subdivisions in Pulse Only without sounding them", () => {
    const { runtime, triggerMetronome, timeline } = setup({
      subdivision: 4,
      subdivisionAudioMode: "pulse-only",
    });
    for (let step = 0; step < 12; step++)
      runtime.tickRepeats[0]?.callback(step / 12, step * 16);
    expect(triggerMetronome).toHaveBeenCalledOnce();
    expect(timeline.getSnapshot()).toMatchObject({ subdivisionIndex: 3 });
  });

  it("counts two primary pulses per 6/8 bar without advancing training", () => {
    const { runtime, triggerMetronome, onStarted, timeline } = setup(
      {
        timeSignature: { numerator: 6, denominator: 8 },
        accentPattern: [true, false],
        trainingMode: "progressive",
      },
      2,
    );
    for (let step = 0; step <= 48; step++)
      runtime.tickRepeats[0]?.callback(step / 12, step * 24);
    expect(triggerMetronome).toHaveBeenCalledTimes(5);
    expect(onStarted).toHaveBeenCalledOnce();
    expect(timeline.getSnapshot()).toMatchObject({
      phase: "metronome",
      stage: 0,
      measure: 1,
      beat: 0,
    });
  });

  it("transitions progression at the measure boundary without changing BPM", () => {
    const { runtime, timeline } = setup({
      trainingMode: "progressive",
      measuresPerStage: 2,
    });
    for (let step = 0; step <= 96; step++)
      runtime.tickRepeats[0]?.callback(step / 12, step * 16);
    expect(timeline.getSnapshot()).toMatchObject({
      stage: 1,
      subdivision: 2,
      stageMeasure: 1,
      beat: 0,
    });
    expect(runtime.scheduledBpmChanges).toEqual([]);
  });

  it("defers live configuration until a safe measure boundary", () => {
    const { runtime, scheduler, configuration, triggerMetronome } = setup();
    runtime.tickRepeats[0]?.callback(0, 0);
    scheduler.update({
      ...configuration,
      subdivision: 3,
      accentPattern: [false, true, false, false],
    });
    runtime.tickRepeats[0]?.callback(0.1, 64);
    expect(triggerMetronome).toHaveBeenCalledOnce();
    runtime.tickRepeats[0]?.callback(4, 768);
    expect(triggerMetronome).toHaveBeenLastCalledWith(
      4,
      "pulse",
      expect.any(Number),
    );
    runtime.tickRepeats[0]?.callback(4.3, 832);
    expect(triggerMetronome).toHaveBeenLastCalledWith(
      4.3,
      "subdivision",
      expect.any(Number),
    );
  });

  it("retains the stage on pause and ignores stale callbacks after stop", () => {
    const { runtime, scheduler, timeline, onComplete } = setup({
      trainingMode: "progressive",
      measuresPerStage: 2,
    });
    runtime.tickRepeats[0]?.callback(4, 1536);
    expect(timeline.getSnapshot()).toMatchObject({ stage: 1 });
    scheduler.pause();
    runtime.tickRepeats[0]?.callback(5, 1536);
    expect(timeline.getSnapshot()).toMatchObject({ stage: 1, beat: 0 });
    runtime.deferDraws = true;
    runtime.deferCallbacks = true;
    runtime.tickRepeats[0]?.callback(6, 1728);
    scheduler.clear();
    runtime.drawCallbacks.forEach((callback) => callback());
    runtime.semanticCallbacks.forEach(({ callback }) => callback());
    runtime.tickRepeats[0]?.callback(8, 6144);
    expect(timeline.getSnapshot()).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    expect(runtime.cleared).toContain(1);
  });

  it("stops after the complete final stage and resets on a new start", () => {
    const {
      runtime,
      onComplete,
      triggerMetronome,
      scheduler,
      configuration,
      timeline,
    } = setup({
      trainingMode: "progressive",
      measuresPerStage: 2,
      endBehavior: "stop",
    });
    runtime.tickRepeats[0]?.callback(20, 6144);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(triggerMetronome).not.toHaveBeenCalled();
    scheduler.schedule(configuration, {
      countInMeasures: 0,
      onStarted: vi.fn(),
      onComplete,
    });
    runtime.tickRepeats[1]?.callback(21, 0);
    expect(timeline.getSnapshot()).toMatchObject({ stage: 0, measure: 1 });
  });
});
