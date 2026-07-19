import type { VisualFrame, VisualTimelineListener } from "@/types/audio";

export class VisualTimeline {
  private readonly listeners = new Set<VisualTimelineListener>();
  private snapshot: VisualFrame | null = null;

  emit(frame: VisualFrame): void {
    this.snapshot = frame;
    for (const listener of this.listeners) {
      listener(frame);
    }
  }

  getSnapshot(): VisualFrame | null {
    return this.snapshot;
  }

  reset(): void {
    if (this.snapshot === null) return;

    this.snapshot = null;
    for (const listener of this.listeners) {
      listener(null);
    }
  }

  subscribe(listener: VisualTimelineListener): () => void {
    this.listeners.add(listener);
    if (this.snapshot) listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
}

export const visualTimeline = new VisualTimeline();
