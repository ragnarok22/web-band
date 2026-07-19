import {
  normalizeVelocity,
  safeStartTime,
  VoiceResources,
} from "@/audio/synthesis/voice-resources";
import {
  getBalancedSynthesisProfile,
  type SoundProfileProvider,
} from "@/audio/synthesis/sound-profiles";
import type { DrumVoice } from "@/types/audio";

export class RimVoice implements DrumVoice {
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
    private readonly getProfile: SoundProfileProvider = getBalancedSynthesisProfile,
  ) {}

  trigger(time: number, velocity = 1): void {
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);
    const profile = this.getProfile();
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(860 * profile.brightness, start);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1_350 * profile.brightness, start);
    filter.Q.setValueAtTime(2.6, start);
    envelope.gain.setValueAtTime(level * 0.16 * profile.gain, start);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      start + 0.045 * profile.decay,
    );

    oscillator.connect(filter).connect(envelope).connect(this.output);
    this.resources.track(oscillator, () => {
      oscillator.disconnect();
      filter.disconnect();
      envelope.disconnect();
    });
    oscillator.start(start);
    oscillator.stop(start + 0.05 * profile.decay);
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
