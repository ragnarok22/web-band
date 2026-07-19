import { ClapVoice } from "@/audio/instruments/clap-voice";
import { ClickVoice } from "@/audio/instruments/click-voice";
import { ClosedHatVoice } from "@/audio/instruments/closed-hat-voice";
import { CymbalVoice } from "@/audio/instruments/cymbal-voice";
import { KickVoice } from "@/audio/instruments/kick-voice";
import { OpenHatVoice } from "@/audio/instruments/open-hat-voice";
import { RimVoice } from "@/audio/instruments/rim-voice";
import { SnareVoice } from "@/audio/instruments/snare-voice";
import { TomVoice } from "@/audio/instruments/tom-voice";
import {
  getSoundCharacterProfile,
  type SoundCharacterProfile,
} from "@/audio/synthesis/sound-profiles";
import {
  createDefaultMixerSettings,
  getEffectiveMixerVolume,
} from "@/lib/mixer";
import type {
  DrumVoice,
  MixerGroup,
  MixerSettings,
  SoundCharacter,
  VoiceMap,
} from "@/types/audio";
import type { DrumInstrument } from "@/types/pattern";

export class InstrumentManager {
  private readonly buses: AudioNode[] = [];
  private readonly clickBus: GainNode;
  private readonly clickVoice: DrumVoice;
  private readonly compressor: DynamicsCompressorNode;
  private readonly groupBuses: Record<MixerGroup, GainNode>;
  private readonly masterGain: GainNode;
  private mixer = createDefaultMixerSettings();
  private profile: SoundCharacterProfile;
  private readonly voices: VoiceMap;

  constructor(
    private readonly context: BaseAudioContext,
    initialVolume: number,
    soundCharacter: SoundCharacter = "balanced",
  ) {
    this.profile = getSoundCharacterProfile(soundCharacter);
    this.groupBuses = {
      cymbals: context.createGain(),
      hiHat: context.createGain(),
      kick: context.createGain(),
      percussion: context.createGain(),
      snare: context.createGain(),
      toms: context.createGain(),
    };
    this.clickBus = context.createGain();
    this.compressor = context.createDynamicsCompressor();

    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.toGain(initialVolume);
    for (const [group, bus] of Object.entries(this.groupBuses) as Array<
      [MixerGroup, GainNode]
    >) {
      bus.gain.value = this.profile.trims[group];
    }
    this.clickBus.gain.value = this.profile.clickTrim;

    this.applyCompressorProfile();

    for (const bus of [...Object.values(this.groupBuses), this.clickBus]) {
      bus.connect(this.masterGain);
    }
    this.masterGain.connect(this.compressor).connect(context.destination);
    this.buses.push(
      ...Object.values(this.groupBuses),
      this.clickBus,
      this.compressor,
    );

    const getSynthesisProfile = () => this.profile.synthesis;

    this.voices = {
      clap: new ClapVoice(
        context,
        this.groupBuses.percussion,
        getSynthesisProfile,
      ),
      closedHat: new ClosedHatVoice(
        context,
        this.groupBuses.hiHat,
        getSynthesisProfile,
      ),
      crash: new CymbalVoice(
        context,
        this.groupBuses.cymbals,
        "crash",
        getSynthesisProfile,
      ),
      highTom: new TomVoice(
        context,
        this.groupBuses.toms,
        190,
        getSynthesisProfile,
      ),
      kick: new KickVoice(context, this.groupBuses.kick, getSynthesisProfile),
      lowTom: new TomVoice(
        context,
        this.groupBuses.toms,
        92,
        getSynthesisProfile,
      ),
      midTom: new TomVoice(
        context,
        this.groupBuses.toms,
        135,
        getSynthesisProfile,
      ),
      openHat: new OpenHatVoice(
        context,
        this.groupBuses.hiHat,
        getSynthesisProfile,
      ),
      ride: new CymbalVoice(
        context,
        this.groupBuses.cymbals,
        "ride",
        getSynthesisProfile,
      ),
      rim: new RimVoice(
        context,
        this.groupBuses.percussion,
        getSynthesisProfile,
      ),
      snare: new SnareVoice(
        context,
        this.groupBuses.snare,
        getSynthesisProfile,
      ),
    };
    this.clickVoice = new ClickVoice(
      context,
      this.clickBus,
      getSynthesisProfile,
    );
  }

  trigger(instrument: DrumInstrument, time: number, velocity: number): void {
    if (instrument === "closedHat") {
      this.voices.openHat?.stop?.(time);
    }
    this.voices[instrument]?.trigger(time, velocity);
  }

  triggerCountIn(time: number, isDownbeat: boolean): void {
    this.clickVoice.trigger(time, isDownbeat ? 1 : 0.62);
  }

  setMasterVolume(volume: number, time = this.context.currentTime): void {
    this.masterGain.gain.cancelScheduledValues(time);
    this.masterGain.gain.setTargetAtTime(this.toGain(volume), time, 0.015);
  }

  setMixer(settings: MixerSettings, time = this.context.currentTime): void {
    this.mixer = structuredClone(settings);
    for (const [group, bus] of Object.entries(this.groupBuses) as Array<
      [MixerGroup, GainNode]
    >) {
      const volume = getEffectiveMixerVolume(settings, group);
      bus.gain.cancelScheduledValues(time);
      bus.gain.setTargetAtTime(
        this.profile.trims[group] * volume * volume,
        time,
        0.015,
      );
    }
  }

  setSoundCharacter(
    soundCharacter: SoundCharacter,
    time = this.context.currentTime,
  ): void {
    this.profile = getSoundCharacterProfile(soundCharacter);
    this.clickBus.gain.value = this.profile.clickTrim;
    this.applyCompressorProfile();
    this.setMixer(this.mixer, time);
  }

  stop(): void {
    for (const voice of Object.values(this.voices)) {
      voice?.stop?.();
    }
    this.clickVoice.stop?.();
  }

  dispose(): void {
    this.stop();
    for (const voice of Object.values(this.voices)) {
      voice?.dispose();
    }
    this.clickVoice.dispose();
    this.masterGain.disconnect();
    for (const bus of this.buses) {
      bus.disconnect();
    }
  }

  private toGain(volume: number): number {
    const normalized = Math.min(1, Math.max(0, volume));
    return normalized * normalized * 0.9;
  }

  private applyCompressorProfile(): void {
    const { compressor } = this.profile;
    this.compressor.threshold.value = compressor.threshold;
    this.compressor.knee.value = compressor.knee;
    this.compressor.ratio.value = compressor.ratio;
    this.compressor.attack.value = compressor.attack;
    this.compressor.release.value = compressor.release;
  }
}
