interface TrackedSource {
  cleanup: () => void;
  stopTime: number | null;
}

export class VoiceResources {
  private readonly sources = new Map<AudioScheduledSourceNode, TrackedSource>();

  track(
    source: AudioScheduledSourceNode,
    cleanup = () => source.disconnect(),
  ): void {
    this.sources.set(source, { cleanup, stopTime: null });
    source.addEventListener(
      "ended",
      () => {
        const tracked = this.sources.get(source);
        if (!tracked) return;

        this.sources.delete(source);
        tracked.cleanup();
      },
      { once: true },
    );
  }

  stop(time?: number): void {
    for (const [source, tracked] of this.sources) {
      if (time !== undefined) {
        if (tracked.stopTime !== null && tracked.stopTime <= time) continue;

        try {
          source.stop(time);
          tracked.stopTime = time;
        } catch {
          // A one-shot source may already have ended between iteration and stop.
        }
        continue;
      }

      this.sources.delete(source);
      try {
        source.stop();
      } catch {
        // A one-shot source may already have ended between iteration and stop.
      } finally {
        tracked.cleanup();
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
