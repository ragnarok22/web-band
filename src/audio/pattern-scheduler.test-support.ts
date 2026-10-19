import { vi } from "vitest";
import type {
  AudioRuntime,
  RuntimeCallback,
  RuntimeTransportState,
} from "@/audio/audio-runtime";

export function schedulerOptions(
  onPatternStarted = vi.fn(),
  countInMeasures: 0 | 1 | 2 | 4 = 1,
) {
  return {
    bpm: 90,
    countInMeasures,
    fillFrequency: null,
    guidedPractice: { mode: "drums" },
    humanization: 0,
    onPatternStarted,
    swing: 0,
  } as const;
}

interface ScheduledRepeat {
  callback: RuntimeCallback;
  duration?: string;
  interval: string;
  startTime?: string | number;
}

export class FakeAudioRuntime implements AudioRuntime {
  readonly clearedCallbacks: number[] = [];
  readonly cleared: number[] = [];
  readonly drawCallbacks: Array<() => void> = [];
  readonly repeats: ScheduledRepeat[] = [];
  readonly semanticCallbacks: Array<{ callback: () => void; id: number }> = [];
  readonly scheduledBpmChanges: Array<{ bpm: number; time: number }> = [];
  readonly swingCalls: Array<{ amount: number; subdivision: "8n" | "16n" }> =
    [];
  readonly timeSignatureCalls: Array<{
    denominator: number;
    numerator: number;
  }> = [];
  bpm = 90;
  deferCallbacks = false;
  deferDraws = false;
  state: RuntimeTransportState = "stopped";

  addContextStateListener(): () => void {
    return () => undefined;
  }
  clearCallback(callbackId: number): void {
    this.clearedCallbacks.push(callbackId);
  }
  cancelDraw(): void {}
  clearSchedule(scheduleId: number): void {
    this.cleared.push(scheduleId);
  }
  getContext(): BaseAudioContext {
    throw new Error("Not used by the scheduler test.");
  }
  getContextState(): AudioContextState {
    return "running";
  }
  getTransportState(): RuntimeTransportState {
    return this.state;
  }
  pauseTransport(): void {
    this.state = "paused";
  }
  resetTransport(): void {}
  scheduleCallback(callback: () => void): number {
    const id = this.semanticCallbacks.length + 1;
    this.semanticCallbacks.push({ callback, id });
    if (!this.deferCallbacks) callback();
    return id;
  }
  scheduleDraw(callback: () => void): void {
    if (this.deferDraws) this.drawCallbacks.push(callback);
    else callback();
  }
  scheduleRepeat(
    callback: RuntimeCallback,
    interval: string,
    startTime?: string | number,
    duration?: string,
  ): number {
    this.repeats.push({ callback, duration, interval, startTime });
    return this.repeats.length;
  }
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }
  setBpmAtTime(bpm: number, time: number): void {
    this.bpm = bpm;
    this.scheduledBpmChanges.push({ bpm, time });
  }
  setSwing(amount: number, subdivision: "8n" | "16n"): void {
    this.swingCalls.push({ amount, subdivision });
  }
  setTimeSignature(numerator: number, denominator: number): void {
    this.timeSignatureCalls.push({ denominator, numerator });
  }
  async startAudio(): Promise<void> {}
  startTransport(): void {
    this.state = "started";
  }
  stopTransport(): void {
    this.state = "stopped";
  }
}
