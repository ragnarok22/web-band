import { createNoiseBuffer } from "@/audio/synthesis/noise";
import {
  normalizeVelocity,
  safeStartTime,
  VoiceResources,
} from "@/audio/synthesis/voice-resources";
import type { DrumVoice } from "@/types/audio";

export class ClapVoice implements DrumVoice {
  private readonly noiseBuffer: AudioBuffer;
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
  ) {
    this.noiseBuffer = createNoiseBuffer(context, 0.2);
  }

  trigger(time: number, velocity = 1): void {
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);

    for (const [index, offset] of [0, 0.018, 0.036].entries()) {
      const noise = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      const hitTime = start + offset;

      noise.buffer = this.noiseBuffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1_700 + index * 260, hitTime);
      filter.Q.setValueAtTime(0.8, hitTime);
      envelope.gain.setValueAtTime(level * (0.22 - index * 0.035), hitTime);
      envelope.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.075);

      noise.connect(filter).connect(envelope).connect(this.output);
      this.resources.track(noise, () => {
        noise.disconnect();
        filter.disconnect();
        envelope.disconnect();
      });
      noise.start(hitTime);
      noise.stop(hitTime + 0.08);
    }
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
