import type { GuidanceFrame } from "@/types/practice";

export type GuidanceTimelineListener = (frame: GuidanceFrame | null) => void;

export class GuidanceTimeline {
  private active = false;
  private readonly listeners = new Set<GuidanceTimelineListener>();
  private snapshot: GuidanceFrame | null = null;

  begin(): void {
    this.active = true;
    this.snapshot = null;
    this.notify();
  }

  getSnapshot(): GuidanceFrame | null {
    return this.snapshot;
  }

  publish(frame: GuidanceFrame): boolean {
    if (!this.active) return false;

    this.snapshot = frame;
    this.notify();
    return true;
  }

  reset(): void {
    if (!this.active && this.snapshot === null) return;

    this.active = false;
    this.snapshot = null;
    this.notify();
  }

  subscribe(listener: GuidanceTimelineListener): () => void {
    this.listeners.add(listener);
    if (this.snapshot) listener(this.snapshot);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: GuidanceTimelineListener): void {
    this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

export const guidanceTimeline = new GuidanceTimeline();
