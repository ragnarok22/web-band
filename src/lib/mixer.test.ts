import { describe, expect, it } from "vitest";

import {
  createDefaultMixerSettings,
  getEffectiveMixerVolume,
} from "@/lib/mixer";

describe("mixer", () => {
  it("returns fresh default settings", () => {
    const first = createDefaultMixerSettings();
    const second = createDefaultMixerSettings();
    first.kick.volume = 0;

    expect(second.kick.volume).toBe(1);
  });

  it("applies mute before volume", () => {
    const settings = createDefaultMixerSettings();
    settings.kick.muted = true;

    expect(getEffectiveMixerVolume(settings, "kick")).toBe(0);
  });

  it("silences non-solo channels when any channel is soloed", () => {
    const settings = createDefaultMixerSettings();
    settings.snare.solo = true;
    settings.snare.volume = 0.6;

    expect(getEffectiveMixerVolume(settings, "kick")).toBe(0);
    expect(getEffectiveMixerVolume(settings, "snare")).toBe(0.6);
  });
});
