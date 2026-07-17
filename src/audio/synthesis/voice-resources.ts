export class VoiceResources {
  private readonly sources = new Set<AudioScheduledSourceNode>();

  track(source: AudioScheduledSourceNode): void {
    this.sources.add(source);
    source.addEventListener(
      "ended",
      () => {
        this.sources.delete(source);
      },
      { once: true },
    );
  }

  stop(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // A one-shot source may already have ended between iteration and stop.
      }
    }

    this.sources.clear();
  }
}

export function normalizeVelocity(velocity = 1): number {
  return Math.min(1, Math.max(0.05, velocity));
}

export function safeStartTime(context: BaseAudioContext, time: number): number {
  return Math.max(context.currentTime, time);
}
