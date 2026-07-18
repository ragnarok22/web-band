import { describe, expect, it } from "vitest";

import { recordTempoTap, TAP_RESET_MS } from "@/lib/tap-tempo";

describe("tap tempo", () => {
  it("calculates BPM from recent tap intervals", () => {
    let result = recordTempoTap([], 0);
    result = recordTempoTap(result.taps, 500);
    result = recordTempoTap(result.taps, 1_010);

    expect(result.bpm).toBe(119);
  });

  it("resets after inactivity", () => {
    const timestamp = 500 + TAP_RESET_MS + 1;
    const result = recordTempoTap([0, 500], timestamp);

    expect(result).toEqual({ bpm: null, taps: [timestamp] });
  });

  it("ignores taps faster than the supported tempo", () => {
    const result = recordTempoTap([1_000], 1_100);

    expect(result).toEqual({ bpm: null, taps: [1_000] });
  });
});
