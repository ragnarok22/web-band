import { ClapVoice } from "@/audio/instruments/clap-voice";
import { ClickVoice } from "@/audio/instruments/click-voice";
import { ClosedHatVoice } from "@/audio/instruments/closed-hat-voice";
import { CymbalVoice } from "@/audio/instruments/cymbal-voice";
import { KickVoice } from "@/audio/instruments/kick-voice";
import { OpenHatVoice } from "@/audio/instruments/open-hat-voice";
import { RimVoice } from "@/audio/instruments/rim-voice";
import { SnareVoice } from "@/audio/instruments/snare-voice";
import { TomVoice } from "@/audio/instruments/tom-voice";
import type { DrumVoice, VoiceMap } from "@/types/audio";
import type { DrumInstrument } from "@/types/pattern";

export class InstrumentManager {
  private readonly buses: AudioNode[] = [];
  private readonly clickVoice: DrumVoice;
  private readonly masterGain: GainNode;
  private readonly voices: VoiceMap;

  constructor(
    private readonly context: BaseAudioContext,
    initialVolume: number,
  ) {
    const kickBus = context.createGain();
    const snareBus = context.createGain();
    const hatBus = context.createGain();
    const tomBus = context.createGain();
    const cymbalBus = context.createGain();
    const percussionBus = context.createGain();
    const clickBus = context.createGain();
    const compressor = context.createDynamicsCompressor();

    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.toGain(initialVolume);
    kickBus.gain.value = 0.95;
    snareBus.gain.value = 0.75;
    hatBus.gain.value = 0.8;
    tomBus.gain.value = 0.82;
    cymbalBus.gain.value = 0.72;
    percussionBus.gain.value = 0.76;
    clickBus.gain.value = 0.9;

    compressor.threshold.value = -8;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.16;

    for (const bus of [
      kickBus,
      snareBus,
      hatBus,
      tomBus,
      cymbalBus,
      percussionBus,
      clickBus,
    ]) {
      bus.connect(this.masterGain);
    }
    this.masterGain.connect(compressor).connect(context.destination);
    this.buses.push(
      kickBus,
      snareBus,
      hatBus,
      tomBus,
      cymbalBus,
      percussionBus,
      clickBus,
      compressor,
    );

    this.voices = {
      clap: new ClapVoice(context, percussionBus),
      closedHat: new ClosedHatVoice(context, hatBus),
      crash: new CymbalVoice(context, cymbalBus, "crash"),
      highTom: new TomVoice(context, tomBus, 190),
      kick: new KickVoice(context, kickBus),
      lowTom: new TomVoice(context, tomBus, 92),
      midTom: new TomVoice(context, tomBus, 135),
      openHat: new OpenHatVoice(context, hatBus),
      ride: new CymbalVoice(context, cymbalBus, "ride"),
      rim: new RimVoice(context, percussionBus),
      snare: new SnareVoice(context, snareBus),
    };
    this.clickVoice = new ClickVoice(context, clickBus);
  }

  trigger(instrument: DrumInstrument, time: number, velocity: number): void {
    if (instrument === "closedHat") {
      this.voices.openHat?.stop?.();
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
