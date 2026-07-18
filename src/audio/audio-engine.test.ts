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
import { createDefaultMixerSettings } from "@/lib/mixer";
import { useAudioStore } from "@/stores/audio-store";

function playbackConfiguration(countInMeasures: 0 | 1 | 2 | 4 = 1) {
  return {
    bpm: 90,
    countInMeasures,
    fillFrequency: null,
    guidedPractice: { mode: "drums" },
    humanization: 0,
    masterVolume: 0.8,
    mixer: createDefaultMixerSettings(),
    pattern: basicRockPattern,
    swing: 0,
  } as const;
}

class FakeAudioRuntime implements AudioRuntime {
  readonly callbacks: RuntimeCallback[] = [];
  readonly drawCallbacks: Array<() => void> = [];
  readonly setBpmCalls: Array<{ bpm: number; smooth: boolean }> = [];
  readonly setBpmAtTimeCalls: Array<{ bpm: number; time: number }> = [];
  readonly setSwingCalls: Array<{ amount: number; subdivision: "8n" | "16n" }> =
    [];
  contextState: AudioContextState = "running";
  deferDraws = false;
  state: RuntimeTransportState = "stopped";
  startError: Error | null = null;
  startPromise: Promise<void> | null = null;

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
    if (this.deferDraws) {
      this.drawCallbacks.push(callback);
    } else {
      callback();
    }
  }
  scheduleRepeat(callback: RuntimeCallback): number {
    this.callbacks.push(callback);
    return this.callbacks.length;
  }
  setBpm(bpm: number, smooth: boolean): void {
    this.setBpmCalls.push({ bpm, smooth });
  }
  setBpmAtTime(bpm: number, time: number): void {
    this.setBpmAtTimeCalls.push({ bpm, time });
  }
  setSwing(amount: number, subdivision: "8n" | "16n"): void {
    this.setSwingCalls.push({ amount, subdivision });
  }
  setTimeSignature(): void {}
  async startAudio(): Promise<void> {
    await this.startPromise;
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
    setMixer: vi.fn(),
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

    await engine.play(playbackConfiguration());
    expect(useAudioStore.getState().status).toBe("counting-in");
    expect(runtime.state).toBe("started");

    runtime.callbacks[1]?.(2);
    expect(useAudioStore.getState().status).toBe("playing");

    engine.pause();
    expect(useAudioStore.getState().status).toBe("paused");
    expect(instruments.stop).toHaveBeenCalled();

    const callbackCount = runtime.callbacks.length;
    const bpmCallCount = runtime.setBpmCalls.length;
    await engine.play({ ...playbackConfiguration(), bpm: 140 });
    expect(useAudioStore.getState().status).toBe("playing");
    expect(runtime.callbacks).toHaveLength(callbackCount);
    expect(runtime.setBpmCalls).toHaveLength(bpmCallCount);

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

    await engine.play(playbackConfiguration());

    expect(engine.changePattern(basicRockPattern, onPatternChanged)).toBe(true);
  });

  it("exposes audio initialization failures without creating instruments", async () => {
    const runtime = new FakeAudioRuntime();
    runtime.startError = new Error("Audio permission denied");
    const factory = vi.fn(() => createInstruments());
    const engine = new AudioEngine(runtime, factory);

    await expect(engine.play(playbackConfiguration())).rejects.toThrow(
      "Audio permission denied",
    );
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

  it("does not finish initialization after disposal", async () => {
    const runtime = new FakeAudioRuntime();
    let resolveStart: () => void = () => undefined;
    runtime.startPromise = new Promise<void>((resolve) => {
      resolveStart = resolve;
    });
    const factory = vi.fn(() => createInstruments());
    const engine = new AudioEngine(runtime, factory);

    const playPromise = engine.play(playbackConfiguration());
    engine.dispose();
    resolveStart();
    await playPromise;

    expect(factory).not.toHaveBeenCalled();
    expect(runtime.state).toBe("stopped");
    expect(useAudioStore.getState().status).toBe("not-initialized");
  });

  it("starts in playing state when count-in is disabled", async () => {
    const runtime = new FakeAudioRuntime();
    const engine = new AudioEngine(runtime, () => createInstruments());

    await engine.play(playbackConfiguration(0));

    expect(useAudioStore.getState().status).toBe("playing");
    expect(runtime.callbacks).toHaveLength(1);
  });

  it("applies mixer settings when playback starts", async () => {
    const runtime = new FakeAudioRuntime();
    const instruments = createInstruments();
    const engine = new AudioEngine(runtime, () => instruments);
    const configuration = playbackConfiguration();

    await engine.play(configuration);

    expect(instruments.setMixer).toHaveBeenCalledWith(configuration.mixer);
  });

  it("starts tempo training at its start BPM and ignores manual BPM changes", async () => {
    const runtime = new FakeAudioRuntime();
    const engine = new AudioEngine(runtime, () => createInstruments());
    const configuration = {
      ...playbackConfiguration(0),
      bpm: 140,
      guidedPractice: {
        mode: "tempoTrainer" as const,
        tempoTrainer: {
          endBpm: 64,
          increment: 2,
          interval: { measures: 1, type: "measures" as const },
          resetToStartingBpmOnStop: false,
          startBpm: 60,
          stopAtTarget: false,
        },
      },
    };

    await engine.play(configuration);
    engine.setBpm(180);

    expect(runtime.setBpmCalls).toEqual([{ bpm: 60, smooth: false }]);
    for (let step = 0; step <= 16; step += 1) {
      runtime.callbacks[0]?.(5 + step / 4);
    }
    expect(runtime.setBpmAtTimeCalls).toEqual([{ bpm: 62, time: 9 }]);
  });

  it("restores only reset-on-stop tempo trainers to their starting BPM", async () => {
    const runtime = new FakeAudioRuntime();
    const engine = new AudioEngine(runtime, () => createInstruments());
    const tempoTrainer = {
      endBpm: 100,
      increment: 5,
      interval: { measures: 1, type: "measures" as const },
      resetToStartingBpmOnStop: true,
      startBpm: 70,
      stopAtTarget: false,
    };

    await engine.play({
      ...playbackConfiguration(0),
      guidedPractice: { mode: "tempoTrainer", tempoTrainer },
    });
    engine.stop();
    expect(runtime.setBpmCalls).toEqual([
      { bpm: 70, smooth: false },
      { bpm: 70, smooth: false },
    ]);

    await engine.play({
      ...playbackConfiguration(0),
      guidedPractice: {
        mode: "tempoTrainer",
        tempoTrainer: {
          ...tempoTrainer,
          resetToStartingBpmOnStop: false,
        },
      },
    });
    engine.stop();
    expect(runtime.setBpmCalls).toHaveLength(3);
  });

  it("stops at target only when the audible Draw callback runs", async () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferDraws = true;
    const engine = new AudioEngine(runtime, () => createInstruments());
    await engine.play({
      ...playbackConfiguration(0),
      guidedPractice: {
        mode: "tempoTrainer",
        tempoTrainer: {
          endBpm: 62,
          increment: 2,
          interval: { measures: 1, type: "measures" },
          resetToStartingBpmOnStop: false,
          startBpm: 60,
          stopAtTarget: true,
        },
      },
    });

    for (let step = 0; step <= 16; step += 1) {
      runtime.callbacks[0]?.(step / 4);
    }
    expect(runtime.state).toBe("started");

    runtime.drawCallbacks.forEach((draw) => draw());
    expect(runtime.state).toBe("stopped");
    expect(useAudioStore.getState().status).toBe("stopped");
  });

  it("stops after resuming when pause cancels a pending target Draw", async () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferDraws = true;
    const engine = new AudioEngine(runtime, () => createInstruments());
    await engine.play({
      ...playbackConfiguration(0),
      guidedPractice: {
        mode: "tempoTrainer",
        tempoTrainer: {
          endBpm: 62,
          increment: 2,
          interval: { measures: 1, type: "measures" },
          resetToStartingBpmOnStop: false,
          startBpm: 60,
          stopAtTarget: true,
        },
      },
    });

    for (let step = 0; step <= 16; step += 1) {
      runtime.callbacks[0]?.(step / 4);
    }
    const canceledDraws = [...runtime.drawCallbacks];
    engine.pause();
    canceledDraws.forEach((draw) => draw());
    expect(runtime.state).toBe("paused");

    await engine.play(playbackConfiguration(0));
    runtime.callbacks[0]?.(17 / 4);
    runtime.drawCallbacks.slice(canceledDraws.length).forEach((draw) => draw());

    expect(runtime.state).toBe("stopped");
    expect(useAudioStore.getState().status).toBe("stopped");
  });

  it("does not let stale target Draw callbacks stop a new session", async () => {
    const runtime = new FakeAudioRuntime();
    runtime.deferDraws = true;
    const engine = new AudioEngine(runtime, () => createInstruments());
    await engine.play({
      ...playbackConfiguration(0),
      guidedPractice: {
        mode: "tempoTrainer",
        tempoTrainer: {
          endBpm: 62,
          increment: 2,
          interval: { measures: 1, type: "measures" },
          resetToStartingBpmOnStop: false,
          startBpm: 60,
          stopAtTarget: true,
        },
      },
    });
    for (let step = 0; step <= 16; step += 1) {
      runtime.callbacks[0]?.(step / 4);
    }
    engine.stop();

    await engine.play(playbackConfiguration(0));
    expect(runtime.state).toBe("started");
    runtime.drawCallbacks.forEach((draw) => draw());

    expect(runtime.state).toBe("started");
    expect(useAudioStore.getState().status).toBe("playing");
  });
});
