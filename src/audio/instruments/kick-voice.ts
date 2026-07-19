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

export class KickVoice implements DrumVoice {
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
    const attack = (0.006 - level * 0.004) * profile.attack;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const click = this.context.createOscillator();
    const clickEnvelope = this.context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      (155 + level * 15) * profile.brightness,
      start,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      52 * profile.brightness,
      start + 0.07 * profile.decay,
    );

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(
      level * 0.95 * profile.gain,
      start + attack,
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      start + 0.34 * profile.decay,
    );

    click.type = "triangle";
    click.frequency.setValueAtTime(1_350 * profile.brightness, start);
    click.frequency.exponentialRampToValueAtTime(
      380 * profile.brightness,
      start + 0.018 * profile.decay,
    );
    clickEnvelope.gain.setValueAtTime(level * 0.08 * profile.gain, start);
    clickEnvelope.gain.exponentialRampToValueAtTime(
      0.0001,
      start + 0.02 * profile.decay,
    );

    oscillator.connect(envelope).connect(this.output);
    click.connect(clickEnvelope).connect(this.output);

    this.resources.track(oscillator, () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
    this.resources.track(click, () => {
      click.disconnect();
      clickEnvelope.disconnect();
    });
    oscillator.start(start);
    oscillator.stop(start + 0.36 * profile.decay);
    click.start(start);
    click.stop(start + 0.025 * profile.decay);
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
