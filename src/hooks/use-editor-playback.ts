"use client";

import { useEffect, useState } from "react";

import { disposeAudioEngine, getAudioEngine } from "@/audio/audio-engine";
import { visualTimeline } from "@/audio/visual-timeline";
import { getStepsPerBar } from "@/lib/musical-time";
import { validateCustomDrumPattern } from "@/lib/persistence-validation";
import { useAudioStore } from "@/stores/audio-store";
import { usePracticeStore } from "@/stores/practice-store";
import type { CustomDrumPattern } from "@/types/persistence";

const activeStatuses = new Set(["counting-in", "initializing", "playing"]);

export function useEditorPlayback(pattern: CustomDrumPattern | null) {
  const status = useAudioStore((state) => state.status);
  const audioError = useAudioStore((state) => state.errorMessage);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const isPlaying = activeStatuses.has(status);

  useEffect(() => {
    return visualTimeline.subscribe((frame) => {
      if (frame.phase !== "pattern" || !pattern) {
        setActiveStep(null);
        return;
      }
      const stepsPerBar = getStepsPerBar(
        pattern.timeSignature,
        pattern.subdivision,
      );
      const measureIndex = (frame.measure - 1) % pattern.bars;
      setActiveStep(measureIndex * stepsPerBar + frame.step);
    });
  }, [pattern]);

  useEffect(() => {
    if (!pattern || !isPlaying || !validateCustomDrumPattern(pattern).success) {
      return;
    }
    const engine = getAudioEngine();
    if (!engine.changePattern(pattern, () => undefined, true)) {
      engine.changePattern(pattern, () => undefined);
    }
  }, [isPlaying, pattern]);

  useEffect(
    () => () => {
      disposeAudioEngine();
    },
    [],
  );

  async function togglePlayback(): Promise<void> {
    const engine = getAudioEngine();
    if (isPlaying) {
      engine.stop();
      setActiveStep(null);
      return;
    }
    if (!pattern || !validateCustomDrumPattern(pattern).success) return;
    const settings = usePracticeStore.getState();
    await engine.play({
      bpm: pattern.defaultBpm,
      countInMeasures: settings.countInMeasures,
      fillFrequency: settings.fillFrequency,
      guidedPractice: { mode: "drums" },
      humanization: settings.humanization,
      masterVolume: settings.masterVolume,
      mixer: settings.mixer,
      pattern,
      swing: settings.swing,
    });
  }

  return { activeStep, audioError, isPlaying, togglePlayback };
}
