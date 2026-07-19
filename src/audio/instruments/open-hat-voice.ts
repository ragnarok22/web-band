import { createNoiseBuffer } from "@/audio/synthesis/noise";
import {
  normalizeVelocity,
  safeStartTime,
  VoiceResources,
} from "@/audio/synthesis/voice-resources";
import type { DrumVoice } from "@/types/audio";

export class OpenHatVoice implements DrumVoice {
  private readonly noiseBuffer: AudioBuffer;
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
  ) {
    this.noiseBuffer = createNoiseBuffer(context, 0.8);
  }

  trigger(time: number, velocity = 1): void {
    this.stop(time);
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);
    const noise = this.context.createBufferSource();
    const highPass = this.context.createBiquadFilter();
    const bandPass = this.context.createBiquadFilter();
    const envelope = this.context.createGain();

    noise.buffer = this.noiseBuffer;
    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(5_400, start);
    bandPass.type = "bandpass";
    bandPass.frequency.setValueAtTime(9_200, start);
    bandPass.Q.setValueAtTime(0.45, start);
    envelope.gain.setValueAtTime(level * 0.27, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

    noise
      .connect(highPass)
      .connect(bandPass)
      .connect(envelope)
      .connect(this.output);
    this.resources.track(noise, () => {
      noise.disconnect();
      highPass.disconnect();
      bandPass.disconnect();
      envelope.disconnect();
    });
    noise.start(start);
    noise.stop(start + 0.46);
  }

  stop(time?: number): void {
    this.resources.stop(time);
  }

  dispose(): void {
    this.stop();
  }
}
