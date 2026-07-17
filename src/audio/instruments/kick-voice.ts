import {
  normalizeVelocity,
  safeStartTime,
  VoiceResources,
} from "@/audio/synthesis/voice-resources";
import type { DrumVoice } from "@/types/audio";

export class KickVoice implements DrumVoice {
  private readonly resources = new VoiceResources();

  constructor(
    private readonly context: BaseAudioContext,
    private readonly output: AudioNode,
  ) {}

  trigger(time: number, velocity = 1): void {
    const start = safeStartTime(this.context, time);
    const level = normalizeVelocity(velocity);
    const attack = 0.006 - level * 0.004;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const click = this.context.createOscillator();
    const clickEnvelope = this.context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(155 + level * 15, start);
    oscillator.frequency.exponentialRampToValueAtTime(52, start + 0.07);

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(level * 0.95, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

    click.type = "triangle";
    click.frequency.setValueAtTime(1_350, start);
    click.frequency.exponentialRampToValueAtTime(380, start + 0.018);
    clickEnvelope.gain.setValueAtTime(level * 0.08, start);
    clickEnvelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.02);

    oscillator.connect(envelope).connect(this.output);
    click.connect(clickEnvelope).connect(this.output);

    this.resources.track(oscillator);
    this.resources.track(click);
    oscillator.start(start);
    oscillator.stop(start + 0.36);
    click.start(start);
    click.stop(start + 0.025);
  }

  stop(): void {
    this.resources.stop();
  }

  dispose(): void {
    this.stop();
  }
}
