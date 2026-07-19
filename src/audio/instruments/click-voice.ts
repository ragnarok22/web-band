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

export class ClickVoice implements DrumVoice {
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
    const envelope = this.context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(
      (level > 0.9 ? 1_650 : 1_050) * profile.brightness,
      start,
    );
    envelope.gain.setValueAtTime(level * 0.18 * profile.gain, start);
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      start + 0.035 * profile.decay,
    );

    oscillator.connect(envelope).connect(this.output);
    this.resources.track(oscillator, () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
    oscillator.start(start);
    oscillator.stop(start + 0.04 * profile.decay);
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
