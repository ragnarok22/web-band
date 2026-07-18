"use client";

import { useSyncExternalStore } from "react";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import type { GuidanceFrame } from "@/types/practice";

function subscribe(onStoreChange: () => void): () => void {
  return guidanceTimeline.subscribe(() => onStoreChange());
}

function getSnapshot(): GuidanceFrame | null {
  return guidanceTimeline.getSnapshot();
}

export function useGuidanceSnapshot(): GuidanceFrame | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
