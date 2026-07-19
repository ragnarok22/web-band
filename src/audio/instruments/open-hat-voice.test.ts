import { describe, expect, it, vi } from "vitest";

import { OpenHatVoice } from "@/audio/instruments/open-hat-voice";

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
});
