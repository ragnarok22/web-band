import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWakeLock } from "@/hooks/use-wake-lock";
import type { AudioEngineStatus } from "@/types/audio";

describe("useWakeLock", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "wakeLock");
  });

  it("requests during practice and releases after stop", async () => {
    const sentinel = new EventTarget() as WakeLockSentinel;
    const release = vi.fn(async () => {
      Object.defineProperty(sentinel, "released", { value: true });
    });
    Object.defineProperties(sentinel, {
      release: { value: release },
      released: { configurable: true, value: false },
      type: { value: "screen" },
    });
    const request = vi.fn(async () => sentinel);
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });

    const { rerender, result } = renderHook(
      ({ status }: { status: AudioEngineStatus }) => useWakeLock(true, status),
      { initialProps: { status: "stopped" as AudioEngineStatus } },
    );
    rerender({ status: "playing" });

    await waitFor(() => expect(result.current).toBe("active"));
    expect(request).toHaveBeenCalledWith("screen");

    rerender({ status: "stopped" });
    await waitFor(() => expect(release).toHaveBeenCalled());
  });
});
