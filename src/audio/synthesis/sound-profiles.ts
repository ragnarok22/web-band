import type { MixerGroup, SoundCharacter } from "@/types/audio";

export interface SoundSynthesisProfile {
  attack: number;
  brightness: number;
  decay: number;
  gain: number;
}

interface CompressorProfile {
  attack: number;
  knee: number;
  ratio: number;
  release: number;
  threshold: number;
}

export interface SoundCharacterProfile {
  clickTrim: number;
  compressor: CompressorProfile;
  synthesis: SoundSynthesisProfile;
  trims: Record<MixerGroup, number>;
}

export type SoundProfileProvider = () => SoundSynthesisProfile;

export const soundCharacterProfiles: Record<
  SoundCharacter,
  SoundCharacterProfile
> = {
  soft: {
    clickTrim: 0.85,
    compressor: {
      attack: 0.008,
      knee: 18,
      ratio: 3,
      release: 0.22,
      threshold: -8,
    },
    synthesis: { attack: 1.4, brightness: 0.86, decay: 1.15, gain: 0.86 },
    trims: {
      cymbals: 0.64,
      hiHat: 0.72,
      kick: 0.9,
      percussion: 0.7,
      snare: 0.68,
      toms: 0.76,
    },
  },
  balanced: {
    clickTrim: 0.9,
    compressor: {
      attack: 0.003,
      knee: 12,
      ratio: 5,
      release: 0.16,
      threshold: -8,
    },
    synthesis: { attack: 1, brightness: 1, decay: 1, gain: 1 },
    trims: {
      cymbals: 0.72,
      hiHat: 0.8,
      kick: 0.95,
      percussion: 0.76,
      snare: 0.75,
      toms: 0.82,
    },
  },
  punchy: {
    clickTrim: 0.9,
    compressor: {
      attack: 0.0015,
      knee: 8,
      ratio: 6,
      release: 0.1,
      threshold: -9,
    },
    synthesis: { attack: 0.7, brightness: 1.1, decay: 0.8, gain: 1.08 },
    trims: {
      cymbals: 0.75,
      hiHat: 0.84,
      kick: 1,
      percussion: 0.8,
      snare: 0.84,
      toms: 0.9,
    },
  },
};

export function getSoundCharacterProfile(
  character: SoundCharacter,
): SoundCharacterProfile {
  return soundCharacterProfiles[character];
}

export function getBalancedSynthesisProfile(): SoundSynthesisProfile {
  return soundCharacterProfiles.balanced.synthesis;
}

export function isSoundCharacter(value: unknown): value is SoundCharacter {
  return value === "soft" || value === "balanced" || value === "punchy";
}
