import type { AudioEngineStatus } from "@/types/audio";

export const audioStatusCopy: Record<AudioEngineStatus, string> = {
  "not-initialized": "Audio waits for your first press",
  initializing: "Starting audio engine",
  ready: "Audio engine ready",
  "counting-in": "Count in: listen for the downbeat",
  playing: "Groove playing",
  paused: "Groove paused",
  stopped: "Groove stopped",
  suspended: "Browser audio suspended: press Play to resume",
  error: "Audio could not start",
};

export function isSessionActive(status: AudioEngineStatus): boolean {
  return (
    status === "initializing" ||
    status === "counting-in" ||
    status === "playing" ||
    status === "paused" ||
    status === "suspended"
  );
}

export function isPracticeRunning(status: AudioEngineStatus): boolean {
  return status === "counting-in" || status === "playing";
}
