import { createNoiseBuffer } from "@/audio/synthesis/noise";
import {
  normalizeVelocity,
  safeStartTime,
  VoiceResources,
} from "@/audio/synthesis/voice-resources";
import type { DrumVoice } from "@/types/audio";

type CymbalKind = "crash" | "ride";

export class CymbalVoice implements DrumVoice {
  private readonly noiseBuffer: AudioBuffer;
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
    private readonly kind: CymbalKind,
  ) {
    this.noiseBuffer = createNoiseBuffer(context, kind === "crash" ? 1.6 : 0.9);
  }

  trigger(time: number, velocity = 1): void {
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);
    const decay = this.kind === "crash" ? 1.25 : 0.48;
    const noise = this.context.createBufferSource();
    const highPass = this.context.createBiquadFilter();
    const noiseEnvelope = this.context.createGain();

    noise.buffer = this.noiseBuffer;
    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(
      this.kind === "crash" ? 3_800 : 5_600,
      start,
    );
    noiseEnvelope.gain.setValueAtTime(
      level * (this.kind === "crash" ? 0.3 : 0.16),
      start,
    );
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, start + decay);

    noise.connect(highPass).connect(noiseEnvelope).connect(this.output);
    this.resources.track(noise, () => {
      noise.disconnect();
      highPass.disconnect();
      noiseEnvelope.disconnect();
    });
    noise.start(start);
    noise.stop(start + decay + 0.05);

    if (this.kind === "ride") {
      this.triggerBell(start, level);
    }
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }

  private triggerBell(start: number, level: number): void {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(4_200, start);
    envelope.gain.setValueAtTime(level * 0.055, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    oscillator.connect(envelope).connect(this.output);
    this.resources.track(oscillator, () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
    oscillator.start(start);
    oscillator.stop(start + 0.34);
  }
}
