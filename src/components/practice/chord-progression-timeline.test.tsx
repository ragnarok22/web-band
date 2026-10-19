import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChordProgressionTimeline } from "@/components/practice/chord-progression-timeline";
import { gDEmCProgression } from "@/data/chord-progressions";
import { getChordTrainerPosition } from "@/lib/guided-practice";

const meter = { numerator: 4, denominator: 4 };
function timeline(at = 0) {
  return (
    <ChordProgressionTimeline
      progression={gDEmCProgression}
      position={getChordTrainerPosition(
        { progression: gDEmCProgression, repeat: true, showCountdown: true },
        meter,
        at,
      )}
    />
  );
}

function viewport() {
  const element = screen.getByRole("region", {
    name: "Chord progression timeline",
  });
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: 200 },
    scrollWidth: { configurable: true, value: 400 },
  });
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    new DOMRect(100, 0, 200, 100),
  );
  return element;
}

describe("chord progression timeline scrolling", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a paused active chord visible after resizing and disconnects its observer", () => {
    let onResize = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          onResize = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const { unmount } = render(timeline());
    const region = viewport();
    region.focus();
    const active = screen.getAllByRole("listitem")[0];
    vi.spyOn(active, "getBoundingClientRect").mockReturnValue(
      new DOMRect(280, 0, 84, 80),
    );
    expect(observe).toHaveBeenCalledWith(region);
    onResize();
    expect(region.scrollLeft).toBe(64);
    expect(region).toHaveFocus();
    region.scrollLeft = 100;
    onResize();
    expect(region.scrollLeft).toBe(100);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("reveals both forward and backward changes locally without changing keyboard focus", () => {
    const { rerender } = render(timeline());
    const region = viewport();
    region.focus();
    const steps = screen.getAllByRole("listitem");
    vi.spyOn(steps[1], "getBoundingClientRect").mockReturnValue(
      new DOMRect(280, 0, 84, 80),
    );
    rerender(timeline(16));
    expect(region.scrollLeft).toBe(64);
    expect(region).toHaveFocus();
    vi.spyOn(steps[0], "getBoundingClientRect").mockReturnValue(
      new DOMRect(60, 0, 84, 80),
    );
    rerender(timeline(64));
    expect(region.scrollLeft).toBe(24);
    expect(region).toHaveFocus();
  });

  it("leaves a visible chord in place and never follows each beat with more scrolling", () => {
    const { rerender } = render(timeline());
    const region = viewport();
    const step = screen.getAllByRole("listitem")[1];
    const bounds = vi
      .spyOn(step, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(120, 0, 84, 80));
    rerender(timeline(16));
    expect(region.scrollLeft).toBe(0);
    region.scrollLeft = 100;
    bounds.mockClear();
    rerender(timeline(20));
    expect(bounds).not.toHaveBeenCalled();
    expect(region.scrollLeft).toBe(100);
  });

  it("uses bounded arrow-key scrolling without triggering global shortcuts or chord jumping", () => {
    render(timeline());
    const region = viewport();
    const globalShortcut = vi.fn();
    window.addEventListener("keydown", globalShortcut);
    try {
      fireEvent.keyDown(region, { key: "ArrowRight" });
      expect(region.scrollLeft).toBe(80);
      fireEvent.keyDown(region, { key: "ArrowRight" });
      fireEvent.keyDown(region, { key: "ArrowRight" });
      expect(region.scrollLeft).toBe(200);
      fireEvent.keyDown(region, { key: "ArrowLeft" });
      expect(region.scrollLeft).toBe(120);
      expect(globalShortcut).not.toHaveBeenCalled();
      expect(screen.getAllByRole("listitem")[0]).toHaveAttribute(
        "aria-current",
        "step",
      );
      fireEvent.keyDown(region, { key: "ArrowRight", altKey: true });
      expect(region.scrollLeft).toBe(120);
      expect(globalShortcut).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener("keydown", globalShortcut);
    }
  });
});
