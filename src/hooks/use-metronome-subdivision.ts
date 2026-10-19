"use client";

import { useSyncExternalStore } from "react";
import { metronomeTimeline } from "@/audio/metronome-timeline";
import type { MetronomeSubdivision } from "@/types/practice";

const getSnapshot = (): MetronomeSubdivision | 0 =>
  metronomeTimeline.getSnapshot()?.subdivision ?? 0;
const getServerSnapshot = (): 0 => 0;

/** Subscribe to a semantic change, not every musical attack. */
export function useMetronomeSubdivision(
  fallback: MetronomeSubdivision,
): MetronomeSubdivision {
  const subdivision = useSyncExternalStore(
    metronomeTimeline.subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return subdivision || fallback;
}
