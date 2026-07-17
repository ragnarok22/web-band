export class VoiceResources {
  private readonly sources = new Map<AudioScheduledSourceNode, () => void>();

  track(
    source: AudioScheduledSourceNode,
    cleanup = () => source.disconnect(),
  ): void {
    this.sources.set(source, cleanup);
    source.addEventListener(
      "ended",
      () => {
        this.sources.get(source)?.();
        this.sources.delete(source);
      },
      { once: true },
    );
  }

  stop(): void {
    for (const source of this.sources.keys()) {
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
