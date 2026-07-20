"use client";

import { useEffect, useState } from "react";

import { isSessionActive } from "@/lib/audio-status";
import type { AudioEngineStatus } from "@/types/audio";

export type WakeLockStatus =
  "unsupported" | "idle" | "requesting" | "active" | "error";

export function useWakeLock(
  enabled: boolean,
  audioStatus: AudioEngineStatus,
): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("idle");
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const shouldHold =
    enabled && audioStatus !== "initializing" && isSessionActive(audioStatus);

  useEffect(() => {
    if (!supported) return () => undefined;
    const wakeLock = navigator.wakeLock;

    let active = true;
    let requestGeneration = 0;
    let sentinel: WakeLockSentinel | null = null;
    async function release(): Promise<void> {
      requestGeneration += 1;
      const current = sentinel;
      sentinel = null;
      if (current && !current.released) await current.release();
      if (active) setStatus("idle");
    }

    async function request(): Promise<void> {
      if (!shouldHold || document.visibilityState !== "visible" || sentinel) {
        return;
      }
      const generation = ++requestGeneration;
      setStatus("requesting");
      try {
        const nextSentinel = await wakeLock.request("screen");
        if (!active || generation !== requestGeneration || !shouldHold) {
          await nextSentinel.release();
          return;
        }
        sentinel = nextSentinel;
        sentinel.onrelease = () => {
          sentinel = null;
          if (active) setStatus("idle");
        };
        setStatus("active");
      } catch {
        if (active && generation === requestGeneration) setStatus("error");
      }
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") void request();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (shouldHold) void request();
    else void release();

    return () => {
      active = false;
      requestGeneration += 1;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sentinel && !sentinel.released) void sentinel.release();
      sentinel = null;
    };
  }, [shouldHold, supported]);

  if (!shouldHold) return "idle";
  return supported ? status : "unsupported";
}
