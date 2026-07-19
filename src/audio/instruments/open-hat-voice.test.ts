import { describe, expect, it, vi } from "vitest";

import { OpenHatVoice } from "@/audio/instruments/open-hat-voice";
import { soundCharacterProfiles } from "@/audio/synthesis/sound-profiles";

const resources = vi.hoisted(() => ({
  stop: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@/audio/synthesis/voice-resources", () => ({
  normalizeVelocity: (velocity = 1) => velocity,
  safeStartTime: (_context: BaseAudioContext, time: number) => time,
  VoiceResources: class {
    stop = resources.stop;
    track = resources.track;
  },
}));

function createParameter() {
  return {
    exponentialRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
  };
}

function createNode(extra: object = {}) {
  return {
    connect: vi.fn((destination: AudioNode) => destination),
    disconnect: vi.fn(),
    ...extra,
  };
}

describe("open hi-hat voice", () => {
  it("stops the previous source at the next scheduled open-hat time", () => {
    const source = createNode({
      start: vi.fn(),
      stop: vi.fn(),
    });
    const context = {
      createBiquadFilter: vi.fn(() =>
        createNode({ frequency: createParameter(), Q: createParameter() }),
      ),
      createBuffer: vi.fn(() => ({
        getChannelData: () => new Float32Array(8),
      })),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => createNode({ gain: createParameter() })),
      currentTime: 1,
      sampleRate: 10,
    } as unknown as BaseAudioContext;
    const voice = new OpenHatVoice(
      context,
      createNode() as unknown as AudioNode,
    );

    voice.trigger(4.25, 0.8);

    expect(resources.stop).toHaveBeenCalledWith(4.25);
  });

  it("uses the selected synthesis profile for subsequently triggered hits", () => {
    const sourceStop = vi.fn();
    const source = createNode({ start: vi.fn(), stop: sourceStop });
    const highPassFrequency = createParameter();
    const bandPassFrequency = createParameter();
    const envelopeGain = createParameter();
    const filters = [
      createNode({ frequency: highPassFrequency, Q: createParameter() }),
      createNode({ frequency: bandPassFrequency, Q: createParameter() }),
    ];
    const gain = createNode({ gain: envelopeGain });
    const context = {
      createBiquadFilter: vi
        .fn()
        .mockReturnValueOnce(filters[0])
        .mockReturnValueOnce(filters[1]),
      createBuffer: vi.fn(() => ({
        getChannelData: () => new Float32Array(8),
      })),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => gain),
      currentTime: 1,
      sampleRate: 10,
    } as unknown as BaseAudioContext;
    const voice = new OpenHatVoice(
      context,
      createNode() as unknown as AudioNode,
      () => soundCharacterProfiles.punchy.synthesis,
    );

    voice.trigger(4.25, 0.8);

    expect(highPassFrequency.setValueAtTime.mock.calls[0]?.[0]).toBeCloseTo(
      5_940,
    );
    expect(highPassFrequency.setValueAtTime.mock.calls[0]?.[1]).toBe(4.25);
    expect(envelopeGain.setValueAtTime).toHaveBeenCalledWith(
      0.8 * 0.27 * 1.08,
      4.25,
    );
    expect(sourceStop).toHaveBeenCalledWith(4.25 + 0.46 * 0.8);
  });
});
