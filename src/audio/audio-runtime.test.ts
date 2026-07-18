import { beforeEach, describe, expect, it, vi } from "vitest";

const tone = vi.hoisted(() => ({
  clearTimeout: vi.fn(),
  getTicksAtTime: vi.fn(),
  immediate: vi.fn(),
  pause: vi.fn(),
  scheduleRepeat: vi.fn(),
  setTimeout: vi.fn(),
  setValueAtTime: vi.fn(),
  stop: vi.fn(),
  timeToTicks: vi.fn(),
  transportTimeToTicks: vi.fn(),
}));

vi.mock("tone", () => ({
  getContext: () => ({
    clearTimeout: tone.clearTimeout,
    immediate: tone.immediate,
    setTimeout: tone.setTimeout,
  }),
  getTransport: () => ({
    bpm: { setValueAtTime: tone.setValueAtTime },
    getTicksAtTime: tone.getTicksAtTime,
    pause: tone.pause,
    PPQ: 192,
    scheduleRepeat: tone.scheduleRepeat,
    stop: tone.stop,
  }),
  Time: (value: string) => ({
    toTicks: () => tone.timeToTicks(value),
  }),
  TransportTime: (value: string | number) => ({
    toTicks: () => tone.transportTimeToTicks(value),
  }),
}));

import { ToneAudioRuntime } from "@/audio/audio-runtime";

describe("Tone audio runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tone.immediate.mockReturnValue(4);
    tone.scheduleRepeat.mockReturnValue(11);
    tone.setTimeout.mockReturnValue(7);
    tone.timeToTicks.mockReturnValue(48);
    tone.transportTimeToTicks.mockReturnValue(0);
  });

  it("sets exact transport BPM at the supplied audio time", () => {
    new ToneAudioRuntime().setBpmAtTime(112, 4.25);

    expect(tone.setValueAtTime).toHaveBeenCalledWith(112, 4.25);
  });

  it("passes stable source sixteenths when callback time moves across ticks", () => {
    tone.getTicksAtTime.mockReturnValue(173);
    const callback = vi.fn();

    new ToneAudioRuntime().scheduleRepeat(callback, "16n");
    const scheduledCallback = tone.scheduleRepeat.mock.calls[0]?.[0] as (
      time: number,
    ) => void;
    scheduledCallback(4.25);
    tone.getTicksAtTime.mockReturnValue(999);
    scheduledCallback(5);

    expect(callback.mock.calls).toEqual([
      [4.25, 0],
      [5, 1],
    ]);
  });

  it("schedules cancellable callbacks on the Tone context clock", () => {
    const runtime = new ToneAudioRuntime();
    const callback = vi.fn();

    expect(runtime.scheduleCallback(callback, 4.1)).toBe(7);
    expect(tone.setTimeout).toHaveBeenCalledOnce();
    expect(tone.setTimeout.mock.calls[0]?.[0]).toBe(callback);
    expect(tone.setTimeout.mock.calls[0]?.[1]).toBeCloseTo(0.1);

    runtime.clearCallback(7);
    expect(tone.clearTimeout).toHaveBeenCalledWith(7);
  });

  it("pauses and stops at the immediate audio time instead of lookahead time", () => {
    const runtime = new ToneAudioRuntime();
    const callback = vi.fn();
    runtime.scheduleRepeat(callback, "16n");
    const scheduledCallback = tone.scheduleRepeat.mock.calls[0]?.[0] as (
      time: number,
    ) => void;
    scheduledCallback(3.9);
    scheduledCallback(4);
    tone.getTicksAtTime.mockReturnValue(48);

    runtime.pauseTransport();
    scheduledCallback(5);
    runtime.stopTransport();

    expect(tone.pause).toHaveBeenCalledWith(4);
    expect(tone.stop).toHaveBeenCalledWith(4);
    expect(callback).toHaveBeenLastCalledWith(5, 1);
  });
});
