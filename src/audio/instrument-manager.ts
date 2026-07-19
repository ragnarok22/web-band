import { ClapVoice } from "@/audio/instruments/clap-voice";
import { ClickVoice } from "@/audio/instruments/click-voice";
import { ClosedHatVoice } from "@/audio/instruments/closed-hat-voice";
import { CymbalVoice } from "@/audio/instruments/cymbal-voice";
import { KickVoice } from "@/audio/instruments/kick-voice";
import { OpenHatVoice } from "@/audio/instruments/open-hat-voice";
import { RimVoice } from "@/audio/instruments/rim-voice";
import { SnareVoice } from "@/audio/instruments/snare-voice";
import { TomVoice } from "@/audio/instruments/tom-voice";
import { getEffectiveMixerVolume } from "@/lib/mixer";
import type {
  DrumVoice,
  MixerGroup,
  MixerSettings,
  VoiceMap,
} from "@/types/audio";
import type { DrumInstrument } from "@/types/pattern";

const mixerTrims: Record<MixerGroup, number> = {
  cymbals: 0.72,
  hiHat: 0.8,
  kick: 0.95,
  percussion: 0.76,
  snare: 0.75,
  toms: 0.82,
};

export class InstrumentManager {
  private readonly buses: AudioNode[] = [];
  private readonly clickVoice: DrumVoice;
  private readonly groupBuses: Record<MixerGroup, GainNode>;
  private readonly masterGain: GainNode;
  private readonly voices: VoiceMap;

  constructor(
    private readonly context: BaseAudioContext,
    initialVolume: number,
  ) {
    this.groupBuses = {
      cymbals: context.createGain(),
      hiHat: context.createGain(),
      kick: context.createGain(),
      percussion: context.createGain(),
      snare: context.createGain(),
      toms: context.createGain(),
    };
    const clickBus = context.createGain();
    const compressor = context.createDynamicsCompressor();

    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.toGain(initialVolume);
    for (const [group, bus] of Object.entries(this.groupBuses) as Array<
      [MixerGroup, GainNode]
    >) {
      bus.gain.value = mixerTrims[group];
    }
    clickBus.gain.value = 0.9;

    compressor.threshold.value = -8;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.16;

    for (const bus of [...Object.values(this.groupBuses), clickBus]) {
      bus.connect(this.masterGain);
    }
    this.masterGain.connect(compressor).connect(context.destination);
    this.buses.push(...Object.values(this.groupBuses), clickBus, compressor);

    this.voices = {
      clap: new ClapVoice(context, this.groupBuses.percussion),
      closedHat: new ClosedHatVoice(context, this.groupBuses.hiHat),
      crash: new CymbalVoice(context, this.groupBuses.cymbals, "crash"),
      highTom: new TomVoice(context, this.groupBuses.toms, 190),
      kick: new KickVoice(context, this.groupBuses.kick),
      lowTom: new TomVoice(context, this.groupBuses.toms, 92),
      midTom: new TomVoice(context, this.groupBuses.toms, 135),
      openHat: new OpenHatVoice(context, this.groupBuses.hiHat),
      ride: new CymbalVoice(context, this.groupBuses.cymbals, "ride"),
      rim: new RimVoice(context, this.groupBuses.percussion),
      snare: new SnareVoice(context, this.groupBuses.snare),
    };
    this.clickVoice = new ClickVoice(context, clickBus);
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
    for (const [group, bus] of Object.entries(this.groupBuses) as Array<
      [MixerGroup, GainNode]
    >) {
      const volume = getEffectiveMixerVolume(settings, group);
      bus.gain.cancelScheduledValues(time);
      bus.gain.setTargetAtTime(
        mixerTrims[group] * volume * volume,
        time,
        0.015,
      );
    }
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
}
