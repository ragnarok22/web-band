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

export class TomVoice implements DrumVoice {
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
    private readonly fundamental: number,
    private readonly getProfile: SoundProfileProvider = getBalancedSynthesisProfile,
  ) {}

  trigger(time: number, velocity = 1): void {
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);
    const profile = this.getProfile();
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(
      this.fundamental * 1.7 * profile.brightness,
      start,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      this.fundamental * profile.brightness,
      start + 0.09 * profile.decay,
    );
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(
      level * 0.58 * profile.gain,
      start + 0.004 * profile.attack,
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      start + 0.3 * profile.decay,
    );

    oscillator.connect(envelope).connect(this.output);
    this.resources.track(oscillator, () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
    oscillator.start(start);
    oscillator.stop(start + 0.33 * profile.decay);
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
