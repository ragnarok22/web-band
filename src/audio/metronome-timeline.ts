import type { MetronomePosition } from "@/types/practice";

export interface MetronomeFrame extends MetronomePosition {
  audioTime: number;
  transportTick: number;
}

export class MetronomeTimeline {
  private snapshot: MetronomeFrame | null = null;
  private readonly listeners = new Set<
    (frame: MetronomeFrame | null) => void
  >();
  getSnapshot = (): MetronomeFrame | null => this.snapshot;
  subscribe = (
    listener: (frame: MetronomeFrame | null) => void,
  ): (() => void) => {
    this.listeners.add(listener);
    if (this.snapshot) listener(this.snapshot);
    return () => this.listeners.delete(listener);
  };
  emit(frame: MetronomeFrame | null): void {
    this.snapshot = frame;
    for (const listener of this.listeners) listener(frame);
  }
  reset(): void {
    this.emit(null);
  }
}

export const metronomeTimeline = new MetronomeTimeline();
