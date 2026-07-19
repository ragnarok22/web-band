"use client";

import { useEffect, useEffectEvent } from "react";

import { isPracticeRunning, isSessionActive } from "@/lib/audio-status";
import type { AudioEngineStatus } from "@/types/audio";
import type { BpmAdjustmentStep } from "@/types/persistence";

export type { BpmAdjustmentStep } from "@/types/persistence";

const interactiveSelector = [
  "input",
  "select",
  "textarea",
  "button",
  "a",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='dialog']",
  "[role='link']",
  "[role='menuitem']",
  "[role='radio']",
  "[role='slider']",
  "[role='switch']",
  "[role='textbox']",
].join(",");

export function isInteractiveShortcutTarget(
  target: EventTarget | null,
): boolean {
  return (
    target instanceof Element && target.closest(interactiveSelector) !== null
  );
}

interface PracticeShortcutOptions {
  adjustmentStep?: BpmAdjustmentStep;
  disabled?: boolean;
  onBpmChange: (amount: number) => void;
  onFocusToggle: () => void;
  onMasterMuteToggle: () => void;
  onPatternChange: (direction: -1 | 1) => void;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  onTapTempo: () => void;
  status: AudioEngineStatus;
}

export function usePracticeShortcuts(options: PracticeShortcutOptions): void {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    if (
      options.disabled ||
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isInteractiveShortcutTarget(event.target)
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    const canRepeat = key.startsWith("arrow");
    if (event.repeat && !canRepeat) return;

    if (event.code === "Space") {
      event.preventDefault();
      if (options.status === "initializing") return;
      if (isPracticeRunning(options.status)) options.onPause();
      else options.onPlay();
      return;
    }

    if (key === "escape") {
      if (isSessionActive(options.status)) {
        event.preventDefault();
        options.onStop();
      }
      return;
    }

    if (key === "arrowup" || key === "arrowdown") {
      event.preventDefault();
      const direction = key === "arrowup" ? 1 : -1;
      const adjustmentStep = options.adjustmentStep ?? 1;
      const alternateStep = adjustmentStep === 1 ? 5 : 1;
      options.onBpmChange(
        direction * (event.shiftKey ? alternateStep : adjustmentStep),
      );
      return;
    }

    if (key === "arrowleft" || key === "arrowright") {
      event.preventDefault();
      options.onPatternChange(key === "arrowleft" ? -1 : 1);
      return;
    }

    if (event.shiftKey) return;
    if (key === "t") options.onTapTempo();
    else if (key === "f") options.onFocusToggle();
    else if (key === "m") options.onMasterMuteToggle();
    else return;
    event.preventDefault();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
