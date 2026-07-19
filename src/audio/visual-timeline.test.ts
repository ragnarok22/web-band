import { describe, expect, it, vi } from "vitest";

import { VisualTimeline } from "@/audio/visual-timeline";

describe("visual timeline", () => {
  it("replays the latest frame to late subscribers", () => {
    const timeline = new VisualTimeline();
    const frame = {
      isAccent: false,
      measure: 2,
      patternStep: 3,
      phase: "pattern" as const,
      sixteenth: 6,
    };
    timeline.emit(frame);

    const listener = vi.fn();
    timeline.subscribe(listener);

    expect(timeline.getSnapshot()).toBe(frame);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(frame);
  });

  it("notifies active subscribers on reset without replaying an empty frame", () => {
    const timeline = new VisualTimeline();
    const listener = vi.fn();
    timeline.subscribe(listener);
    timeline.emit({
      beat: 2,
      isAccent: false,
      measure: 1,
      phase: "count-in",
    });

    timeline.reset();

    expect(listener).toHaveBeenLastCalledWith(null);
    expect(timeline.getSnapshot()).toBeNull();
    const lateListener = vi.fn();
    timeline.subscribe(lateListener);
    expect(lateListener).not.toHaveBeenCalled();
  });
});
