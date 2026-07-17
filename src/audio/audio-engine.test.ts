import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AudioEngine,
  disposeAudioEngine,
  type ManagedInstruments,
} from "@/audio/audio-engine";
import type {
  AudioRuntime,
  RuntimeCallback,
  RuntimeTransportState,
} from "@/audio/audio-runtime";
import { basicRockPattern } from "@/data/patterns/rock";
import { useAudioStore } from "@/stores/audio-store";

class FakeAudioRuntime implements AudioRuntime {
  readonly callbacks: RuntimeCallback[] = [];
  readonly setBpmCalls: Array<{ bpm: number; smooth: boolean }> = [];
  contextState: AudioContextState = "running";
  state: RuntimeTransportState = "stopped";
  startError: Error | null = null;

  addContextStateListener(): () => void {
    return () => undefined;
  }
  cancelDraw(): void {}
  clearSchedule(): void {}
  getContext(): BaseAudioContext {
    return null as unknown as BaseAudioContext;
  }
  getContextState(): AudioContextState {
    return this.contextState;
  }
  getTransportState(): RuntimeTransportState {
    return this.state;
  }
  pauseTransport(): void {
    this.state = "paused";
  }
  resetTransport(): void {}
  scheduleDraw(callback: () => void): void {
    callback();
  }
  scheduleRepeat(callback: RuntimeCallback): number {
    this.callbacks.push(callback);
    return this.callbacks.length;
  }
  setBpm(bpm: number, smooth: boolean): void {
    this.setBpmCalls.push({ bpm, smooth });
  }
  setTimeSignature(): void {}
  async startAudio(): Promise<void> {
    if (this.startError) throw this.startError;
    this.contextState = "running";
  }
  startTransport(): void {
    this.state = "started";
  }
  stopTransport(): void {
    this.state = "stopped";
  }
}

function createInstruments(): ManagedInstruments {
  return {
    dispose: vi.fn(),
    setMasterVolume: vi.fn(),
    stop: vi.fn(),
    trigger: vi.fn(),
    triggerCountIn: vi.fn(),
  };
}

describe("audio engine", () => {
  beforeEach(() => {
    vi.stubGlobal("AudioContext", class AudioContextStub {});
    useAudioStore.setState({ errorMessage: null, status: "not-initialized" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("moves from count-in to playing and supports pause, resume, and stop", async () => {
    const runtime = new FakeAudioRuntime();
    const instruments = createInstruments();
    const engine = new AudioEngine(runtime, () => instruments);

    await engine.play({
      bpm: 90,
      masterVolume: 0.8,
      pattern: basicRockPattern,
    });
    expect(useAudioStore.getState().status).toBe("counting-in");
    expect(runtime.state).toBe("started");

    runtime.callbacks[1]?.(2);
    expect(useAudioStore.getState().status).toBe("playing");

    engine.pause();
    expect(useAudioStore.getState().status).toBe("paused");
    expect(instruments.stop).toHaveBeenCalled();

    await engine.play({
      bpm: 90,
      masterVolume: 0.8,
      pattern: basicRockPattern,
    });
    expect(useAudioStore.getState().status).toBe("playing");

    engine.stop();
    expect(useAudioStore.getState().status).toBe("stopped");
    expect(runtime.state).toBe("stopped");
  });

  it("clamps BPM before updating the transport", () => {
    const runtime = new FakeAudioRuntime();
    const engine = new AudioEngine(runtime, () => createInstruments());

    engine.setBpm(999);
    expect(runtime.setBpmCalls).toEqual([{ bpm: 220, smooth: true }]);
  });

  it("queues pattern changes while the transport is active", async () => {
    const runtime = new FakeAudioRuntime();
    const engine = new AudioEngine(runtime, () => createInstruments());
    const onPatternChanged = vi.fn();

    await engine.play({
      bpm: 90,
      masterVolume: 0.8,
      pattern: basicRockPattern,
    });

    expect(engine.changePattern(basicRockPattern, onPatternChanged)).toBe(true);
  });

  it("exposes audio initialization failures without creating instruments", async () => {
    const runtime = new FakeAudioRuntime();
    runtime.startError = new Error("Audio permission denied");
    const factory = vi.fn(() => createInstruments());
    const engine = new AudioEngine(runtime, factory);

    await expect(
      engine.play({
        bpm: 90,
        masterVolume: 0.8,
        pattern: basicRockPattern,
      }),
    ).rejects.toThrow("Audio permission denied");
    expect(factory).not.toHaveBeenCalled();
    expect(useAudioStore.getState()).toMatchObject({
      errorMessage: "Audio permission denied",
      status: "error",
    });
  });

  it("clears stale playing state when no engine singleton remains", () => {
    disposeAudioEngine();
    useAudioStore.getState().setStatus("playing");

    disposeAudioEngine();

    expect(useAudioStore.getState().status).toBe("not-initialized");
  });
});
