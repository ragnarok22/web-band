import { beforeEach, describe, expect, it, vi } from "vitest";

const tone = vi.hoisted(() => ({
  setValueAtTime: vi.fn(),
}));

vi.mock("tone", () => ({
  getTransport: () => ({
    bpm: { setValueAtTime: tone.setValueAtTime },
  }),
}));

import { ToneAudioRuntime } from "@/audio/audio-runtime";

describe("Tone audio runtime", () => {
  beforeEach(() => {
    tone.setValueAtTime.mockClear();
  });

  it("sets exact transport BPM at the supplied audio time", () => {
    new ToneAudioRuntime().setBpmAtTime(112, 4.25);

    expect(tone.setValueAtTime).toHaveBeenCalledWith(112, 4.25);
  });
});
