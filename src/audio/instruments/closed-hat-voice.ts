import { createNoiseBuffer } from "@/audio/synthesis/noise";
import {
  normalizeVelocity,
  safeStartTime,
  VoiceResources,
} from "@/audio/synthesis/voice-resources";
import type { DrumVoice } from "@/types/audio";

export class ClosedHatVoice implements DrumVoice {
  private readonly noiseBuffer: AudioBuffer;
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
  ) {
    this.noiseBuffer = createNoiseBuffer(context, 0.25);
  }

  trigger(time: number, velocity = 1): void {
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);
    const noise = this.context.createBufferSource();
    const highPass = this.context.createBiquadFilter();
    const bandPass = this.context.createBiquadFilter();
    const envelope = this.context.createGain();

    noise.buffer = this.noiseBuffer;
    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(6_800, start);
    bandPass.type = "bandpass";
    bandPass.frequency.setValueAtTime(10_500, start);
    bandPass.Q.setValueAtTime(0.6, start);
    envelope.gain.setValueAtTime(level * 0.33, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.055);

    noise
      .connect(highPass)
      .connect(bandPass)
      .connect(envelope)
      .connect(this.output);
    this.resources.track(noise);
    noise.start(start);
    noise.stop(start + 0.065);
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
