import { describe, expect, it, vi } from "vitest";
import { ClickVoice } from "@/audio/instruments/click-voice";
import type { MetronomeClickKind } from "@/types/practice";

function node<Extra extends object>(extra: Extra) {
  return {
    connect: vi.fn((destination: AudioNode) => destination),
    disconnect: vi.fn(),
    ...extra,
  };
}

function setup() {
  const frequency = { setValueAtTime: vi.fn() };
  const envelope = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  const oscillator = node({
    type: "sine",
    frequency,
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
  });
  const gain = node({ gain: envelope });
  const context = {
    currentTime: 1,
    createOscillator: () => oscillator,
    createGain: () => gain,
  } as unknown as BaseAudioContext;
  return {
    voice: new ClickVoice(context, node({}) as unknown as AudioNode),
    oscillator,
    frequency,
    envelope,
  };
}

describe("synthesized metronome click", () => {
  it.each([
    ["accent", 1650],
    ["pulse", 1150],
    ["subdivision", 850],
  ] as Array<[MetronomeClickKind, number]>)(
    "uses an explicit %s timbre independent of velocity",
    (kind, pitch) => {
      const { voice, oscillator, frequency, envelope } = setup();
      voice.trigger(4.25, 0.2, kind);
      expect(oscillator.type).toBe("triangle");
      expect(frequency.setValueAtTime).toHaveBeenCalledWith(pitch, 4.25);
      expect(envelope.setValueAtTime).toHaveBeenCalledWith(0.2 * 0.18, 4.25);
      expect(oscillator.start).toHaveBeenCalledWith(4.25);
      expect(oscillator.stop).toHaveBeenCalledWith(4.29);
      voice.dispose();
      expect(oscillator.stop).toHaveBeenLastCalledWith();
      expect(oscillator.disconnect).toHaveBeenCalled();
    },
  );

  it("preserves legacy count-in timbre while allowing quiet metronome levels", () => {
    const { voice, oscillator, envelope, frequency } = setup();
    voice.trigger(2, 1);
    expect(oscillator.type).toBe("square");
    expect(frequency.setValueAtTime).toHaveBeenCalledWith(1650, 2);
    voice.trigger(3, 0.005, "subdivision");
    expect(envelope.setValueAtTime).toHaveBeenLastCalledWith(0.005 * 0.18, 3);
    voice.stop();
  });
});
