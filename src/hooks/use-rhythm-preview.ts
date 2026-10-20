"use client";

import { useEffect, useRef } from "react";

import { visualTimeline } from "@/audio/visual-timeline";
import type { DrumPattern } from "@/types/pattern";

/** A display-only consumer of the audio engine's already synchronized frames. */
export function useRhythmPreview(pattern: DrumPattern, enabled: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measures = Array.from(
      root.querySelectorAll<HTMLElement>("[data-rhythm-measure]"),
    );
    const description = root.querySelector<HTMLElement>(
      "[data-rhythm-description]",
    );
    const cellsByMeasure = measures.map((measure) => {
      const steps = new Map<number, HTMLElement[]>();
      for (const cell of measure.querySelectorAll<HTMLElement>(
        "[data-rhythm-cell]",
      )) {
        const step = Number(cell.dataset.step);
        const cells = steps.get(step) ?? [];
        cells.push(cell);
        steps.set(step, cells);
      }
      return steps;
    });
    const beatsByMeasure = measures.map((measure) =>
      Array.from(measure.querySelectorAll<HTMLElement>("[data-beat-label]")),
    );
    let activeElements: HTMLElement[] = [];
    let displayedMeasure = 0;

    function clearHighlight() {
      for (const element of activeElements)
        element.removeAttribute("data-active");
      activeElements = [];
    }

    const showMeasure = (index: number) => {
      measures.forEach((measure, measureIndex) => {
        measure.hidden = measureIndex !== index;
      });
      root.dataset.currentMeasure = String(index + 1);
      if (description)
        description.textContent = `Measure ${index + 1} of ${pattern.bars}. Beat numbers mark the main pulses.`;
      displayedMeasure = index;
    };

    function reset() {
      clearHighlight();
      showMeasure(0);
    }

    reset();
    if (!enabled) return;

    // No timers, animation frames, or per-tick React/Zustand state: Tone's draw
    // timeline remains the only clock. Only the audible card subscribes.
    const unsubscribe = visualTimeline.subscribe((frame) => {
      clearHighlight();
      if (!frame || frame.phase !== "pattern") {
        showMeasure(0);
        return;
      }

      const measureIndex = (frame.measure - 1) % pattern.bars;
      if (measureIndex !== displayedMeasure) showMeasure(measureIndex);
      const beat = beatsByMeasure[measureIndex]?.find(
        (element) =>
          frame.patternStep >= Number(element.dataset.startStep) &&
          frame.patternStep < Number(element.dataset.endStep),
      );
      activeElements = [
        ...(cellsByMeasure[measureIndex]?.get(frame.patternStep) ?? []),
        ...(beat ? [beat] : []),
      ];
      for (const element of activeElements) element.dataset.active = "true";
    });

    return () => {
      unsubscribe();
      reset();
    };
  }, [enabled, pattern]);

  return rootRef;
}
