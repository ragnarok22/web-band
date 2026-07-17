import { ClickVoice } from "@/audio/instruments/click-voice";
import { ClosedHatVoice } from "@/audio/instruments/closed-hat-voice";
import { KickVoice } from "@/audio/instruments/kick-voice";
import { SnareVoice } from "@/audio/instruments/snare-voice";
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
    const clickBus = context.createGain();
    const compressor = context.createDynamicsCompressor();

    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.toGain(initialVolume);
    kickBus.gain.value = 0.95;
    snareBus.gain.value = 0.75;
    hatBus.gain.value = 0.8;
    clickBus.gain.value = 0.9;

    compressor.threshold.value = -8;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.16;

    for (const bus of [kickBus, snareBus, hatBus, clickBus]) {
      bus.connect(this.masterGain);
    }
    this.masterGain.connect(compressor).connect(context.destination);
    this.buses.push(kickBus, snareBus, hatBus, clickBus, compressor);

    this.voices = {
      closedHat: new ClosedHatVoice(context, hatBus),
      kick: new KickVoice(context, kickBus),
      snare: new SnareVoice(context, snareBus),
    };
    this.clickVoice = new ClickVoice(context, clickBus);
  }

  trigger(instrument: DrumInstrument, time: number, velocity: number): void {
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
