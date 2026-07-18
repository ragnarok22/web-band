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
        const trackedCleanup = this.sources.get(source);
        if (!trackedCleanup) return;

        this.sources.delete(source);
        trackedCleanup();
      },
      { once: true },
    );
  }

  stop(): void {
    for (const [source, cleanup] of this.sources) {
      this.sources.delete(source);
      try {
        source.stop();
      } catch {
        // A one-shot source may already have ended between iteration and stop.
      } finally {
        cleanup();
      }
    }
  }
}

export function normalizeVelocity(velocity = 1): number {
  return Math.min(1, Math.max(0.05, velocity));
}

export function safeStartTime(context: BaseAudioContext, time: number): number {
  return Math.max(context.currentTime, time);
}
