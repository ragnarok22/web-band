import { describe, expect, it, vi } from "vitest";

import { GuidanceTimeline } from "@/audio/guidance-timeline";
import type { GuidanceFrame } from "@/types/practice";

const firstFrame: GuidanceFrame = {
  absoluteSixteenth: 0,
  elapsedSeconds: 0,
  measure: 1,
  mode: "drums",
};

describe("guidance timeline", () => {
  it("retains and replays the latest session frame", () => {
    const timeline = new GuidanceTimeline();
    timeline.begin();
    expect(timeline.publish(firstFrame)).toBe(true);

    const listener = vi.fn();
    const unsubscribe = timeline.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(firstFrame);
    expect(timeline.getSnapshot()).toBe(firstFrame);
    unsubscribe();
    timeline.publish({ ...firstFrame, absoluteSixteenth: 1 });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("clears subscribers on begin/reset and rejects stale publication", () => {
    const timeline = new GuidanceTimeline();
    const listener = vi.fn();
    timeline.subscribe(listener);

    timeline.begin();
    timeline.publish(firstFrame);
    timeline.reset();

    expect(listener.mock.calls.map(([frame]) => frame)).toEqual([
      null,
      firstFrame,
      null,
    ]);
    expect(timeline.getSnapshot()).toBeNull();
    expect(timeline.publish(firstFrame)).toBe(false);
  });

  it("supports explicit listener removal", () => {
    const timeline = new GuidanceTimeline();
    const listener = vi.fn();
    timeline.subscribe(listener);
    timeline.unsubscribe(listener);
    timeline.begin();

    expect(listener).not.toHaveBeenCalled();
  });
});
