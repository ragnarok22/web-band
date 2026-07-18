import type { MixerGroup, MixerSettings } from "@/types/audio";

export const mixerGroups: readonly MixerGroup[] = [
  "kick",
  "snare",
  "hiHat",
  "toms",
  "cymbals",
  "percussion",
];

export function createDefaultMixerSettings(): MixerSettings {
  return {
    cymbals: { muted: false, solo: false, volume: 1 },
    hiHat: { muted: false, solo: false, volume: 1 },
    kick: { muted: false, solo: false, volume: 1 },
    percussion: { muted: false, solo: false, volume: 1 },
    snare: { muted: false, solo: false, volume: 1 },
    toms: { muted: false, solo: false, volume: 1 },
  };
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function getEffectiveMixerVolume(
  settings: MixerSettings,
  group: MixerGroup,
): number {
  const channel = settings[group];
  if (channel.muted) return 0;

  const hasSolo = mixerGroups.some((candidate) => settings[candidate].solo);
  if (hasSolo && !channel.solo) return 0;

  return clampUnit(channel.volume);
}
