import { describe, expect, it, vi } from "vitest";

import { InstrumentManager } from "@/audio/instrument-manager";

const voices = vi.hoisted(() => {
  const voice = () => ({
    dispose: vi.fn(),
    stop: vi.fn(),
    trigger: vi.fn(),
  });
  return {
    clap: voice(),
    click: voice(),
    closedHat: voice(),
    crash: voice(),
    highTom: voice(),
    kick: voice(),
    lowTom: voice(),
    midTom: voice(),
    openHat: voice(),
    ride: voice(),
    rim: voice(),
    snare: voice(),
  };
});

vi.mock("@/audio/instruments/clap-voice", () => ({
  ClapVoice: class {
    dispose = voices.clap.dispose;
    stop = voices.clap.stop;
    trigger = voices.clap.trigger;
  },
}));
vi.mock("@/audio/instruments/click-voice", () => ({
  ClickVoice: class {
    dispose = voices.click.dispose;
    stop = voices.click.stop;
    trigger = voices.click.trigger;
  },
}));
vi.mock("@/audio/instruments/closed-hat-voice", () => ({
  ClosedHatVoice: class {
    dispose = voices.closedHat.dispose;
    stop = voices.closedHat.stop;
    trigger = voices.closedHat.trigger;
  },
}));
vi.mock("@/audio/instruments/cymbal-voice", () => ({
  CymbalVoice: class {
    dispose = voices.crash.dispose;
    stop = voices.crash.stop;
    trigger = voices.crash.trigger;
  },
}));
vi.mock("@/audio/instruments/kick-voice", () => ({
  KickVoice: class {
    dispose = voices.kick.dispose;
    stop = voices.kick.stop;
    trigger = voices.kick.trigger;
  },
}));
vi.mock("@/audio/instruments/open-hat-voice", () => ({
  OpenHatVoice: class {
    dispose = voices.openHat.dispose;
    stop = voices.openHat.stop;
    trigger = voices.openHat.trigger;
  },
}));
vi.mock("@/audio/instruments/rim-voice", () => ({
  RimVoice: class {
    dispose = voices.rim.dispose;
    stop = voices.rim.stop;
    trigger = voices.rim.trigger;
  },
}));
vi.mock("@/audio/instruments/snare-voice", () => ({
  SnareVoice: class {
    dispose = voices.snare.dispose;
    stop = voices.snare.stop;
    trigger = voices.snare.trigger;
  },
}));
vi.mock("@/audio/instruments/tom-voice", () => ({
  TomVoice: class {
    dispose = voices.lowTom.dispose;
    stop = voices.lowTom.stop;
    trigger = voices.lowTom.trigger;
  },
}));

function createNode(extra: object = {}) {
  return {
    connect: vi.fn((destination: AudioNode) => destination),
    disconnect: vi.fn(),
    ...extra,
  };
}

function createContext(): BaseAudioContext {
  const parameter = () => ({
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
    value: 0,
  });
  return {
    createDynamicsCompressor: vi.fn(() =>
      createNode({
        attack: parameter(),
        knee: parameter(),
        ratio: parameter(),
        release: parameter(),
        threshold: parameter(),
      }),
    ),
    createGain: vi.fn(() => createNode({ gain: parameter() })),
    currentTime: 0,
    destination: createNode(),
  } as unknown as BaseAudioContext;
}

describe("instrument manager", () => {
  it("chokes the open hi-hat at the scheduled closed-hat time", () => {
    const manager = new InstrumentManager(createContext(), 0.8);

    manager.trigger("closedHat", 4.25, 0.7);

    expect(voices.openHat.stop).toHaveBeenCalledWith(4.25);
    expect(voices.closedHat.trigger).toHaveBeenCalledWith(4.25, 0.7);
  });
});
