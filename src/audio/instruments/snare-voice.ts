import { createNoiseBuffer } from "@/audio/synthesis/noise";
import {
  normalizeVelocity,
  safeStartTime,
  VoiceResources,
} from "@/audio/synthesis/voice-resources";
import type { DrumVoice } from "@/types/audio";

export class SnareVoice implements DrumVoice {
  private readonly noiseBuffer: AudioBuffer;
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
  ) {
    this.noiseBuffer = createNoiseBuffer(context);
  }

  trigger(time: number, velocity = 1): void {
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);
    const noise = this.context.createBufferSource();
    const noiseFilter = this.context.createBiquadFilter();
    const noiseEnvelope = this.context.createGain();
    const body = this.context.createOscillator();
    const bodyEnvelope = this.context.createGain();

    noise.buffer = this.noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2_400, start);
    noiseFilter.Q.setValueAtTime(0.65, start);
    noiseEnvelope.gain.setValueAtTime(level * 0.72, start);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);

    body.type = "triangle";
    body.frequency.setValueAtTime(190, start);
    body.frequency.exponentialRampToValueAtTime(125, start + 0.085);
    bodyEnvelope.gain.setValueAtTime(level * 0.34, start);
    bodyEnvelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

    noise.connect(noiseFilter).connect(noiseEnvelope).connect(this.output);
    body.connect(bodyEnvelope).connect(this.output);

    this.resources.track(noise);
    this.resources.track(body);
    noise.start(start);
    noise.stop(start + 0.18);
    body.start(start);
    body.stop(start + 0.14);
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
