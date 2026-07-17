import type {
  ScheduledVisualStep,
  VisualTimelineListener,
} from "@/types/audio";

export class VisualTimeline {
  private readonly listeners = new Set<VisualTimelineListener>();

  emit(step: ScheduledVisualStep): void {
    for (const listener of this.listeners) {
      listener(step);
    }
  }

  subscribe(listener: VisualTimelineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const visualTimeline = new VisualTimeline();
