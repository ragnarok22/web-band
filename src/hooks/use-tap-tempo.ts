"use client";

import { useCallback, useRef } from "react";

import { recordTempoTap } from "@/lib/tap-tempo";

export function useTapTempo(onTempo: (bpm: number) => void): () => void {
  const tapsRef = useRef<number[]>([]);

  return useCallback(() => {
    const result = recordTempoTap(tapsRef.current, performance.now());
    tapsRef.current = result.taps;
    if (result.bpm !== null) onTempo(result.bpm);
  }, [onTempo]);
}
