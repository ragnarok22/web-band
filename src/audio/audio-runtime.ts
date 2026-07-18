import * as Tone from "tone";

export type RuntimeTransportState = "started" | "paused" | "stopped";
export type RuntimeSwingSubdivision = "8n" | "16n";
export type RuntimeCallback = (
  time: number,
  transportSixteenth: number,
) => void;

export interface AudioRuntime {
  addContextStateListener(listener: () => void): () => void;
  clearCallback(callbackId: number): void;
  cancelDraw(): void;
  clearSchedule(scheduleId: number): void;
  getContext(): BaseAudioContext;
  getContextState(): AudioContextState;
  getTransportState(): RuntimeTransportState;
  pauseTransport(): void;
  resetTransport(): void;
  scheduleCallback(callback: () => void, time: number): number;
  scheduleDraw(callback: () => void, time: number): void;
  scheduleRepeat(
    callback: RuntimeCallback,
    interval: string,
    startTime?: string | number,
    duration?: string,
  ): number;
  setBpm(bpm: number, smooth: boolean): void;
  setBpmAtTime(bpm: number, time: number): void;
  setSwing(amount: number, subdivision: RuntimeSwingSubdivision): void;
  setTimeSignature(numerator: number, denominator: number): void;
  startAudio(): Promise<void>;
  startTransport(): void;
  stopTransport(): void;
}

interface RepeatTracker {
  intervalTicks: number;
  nextTick: number;
  startTick: number;
}

export class ToneAudioRuntime implements AudioRuntime {
  private readonly repeatTrackers = new Map<number, RepeatTracker>();

  addContextStateListener(listener: () => void): () => void {
    const context = Tone.getContext().rawContext;
    context.addEventListener("statechange", listener);
    return () => context.removeEventListener("statechange", listener);
  }

  cancelDraw(): void {
    Tone.getDraw().cancel();
  }

  clearCallback(callbackId: number): void {
    Tone.getContext().clearTimeout(callbackId);
  }

  clearSchedule(scheduleId: number): void {
    Tone.getTransport().clear(scheduleId);
    this.repeatTrackers.delete(scheduleId);
  }

  getContext(): BaseAudioContext {
    return Tone.getContext().rawContext;
  }

  getContextState(): AudioContextState {
    return Tone.getContext().state;
  }

  getTransportState(): RuntimeTransportState {
    return Tone.getTransport().state;
  }

  pauseTransport(): void {
    const context = Tone.getContext();
    const transport = Tone.getTransport();
    const time = context.immediate();
    const pauseTick = transport.getTicksAtTime(time);
    for (const tracker of this.repeatTrackers.values()) {
      const elapsedIntervals = Math.max(
        0,
        Math.ceil(
          (pauseTick - tracker.startTick) / tracker.intervalTicks - 1e-6,
        ),
      );
      tracker.nextTick =
        tracker.startTick + elapsedIntervals * tracker.intervalTicks;
    }
    transport.pause(time);
  }

  resetTransport(): void {
    Tone.getTransport().position = 0;
    for (const tracker of this.repeatTrackers.values()) {
      tracker.nextTick = tracker.startTick;
    }
  }

  scheduleCallback(callback: () => void, time: number): number {
    const context = Tone.getContext();
    return context.setTimeout(
      callback,
      Math.max(0, time - context.immediate()),
    );
  }

  scheduleDraw(callback: () => void, time: number): void {
    Tone.getDraw().schedule(callback, time);
  }

  scheduleRepeat(
    callback: RuntimeCallback,
    interval: string,
    startTime: string | number = 0,
    duration?: string,
  ): number {
    const transport = Tone.getTransport();
    const ticksPerSixteenth = transport.PPQ / 4;
    const intervalTicks = Tone.Time(interval).toTicks();
    const startTick = Tone.TransportTime(startTime).toTicks();
    const tracker: RepeatTracker = {
      intervalTicks,
      nextTick: startTick,
      startTick,
    };
    const scheduleId = transport.scheduleRepeat(
      (time) => {
        const transportSixteenth = Math.round(
          tracker.nextTick / ticksPerSixteenth,
        );
        tracker.nextTick += tracker.intervalTicks;
        callback(time, transportSixteenth);
      },
      interval,
      startTime,
      duration,
    );
    this.repeatTrackers.set(scheduleId, tracker);
    return scheduleId;
  }

  setBpm(bpm: number, smooth: boolean): void {
    const bpmSignal = Tone.getTransport().bpm;
    if (smooth && Tone.getTransport().state === "started") {
      bpmSignal.rampTo(bpm, 0.08);
    } else {
      bpmSignal.value = bpm;
    }
  }

  setBpmAtTime(bpm: number, time: number): void {
    Tone.getTransport().bpm.setValueAtTime(bpm, time);
  }

  setSwing(amount: number, subdivision: RuntimeSwingSubdivision): void {
    const transport = Tone.getTransport();
    transport.swingSubdivision = subdivision;
    transport.swing = amount;
  }

  setTimeSignature(numerator: number, denominator: number): void {
    Tone.getTransport().timeSignature = [numerator, denominator];
  }

  async startAudio(): Promise<void> {
    await Tone.start();
  }

  startTransport(): void {
    Tone.getTransport().start();
  }

  stopTransport(): void {
    Tone.getTransport().stop(Tone.getContext().immediate());
  }
}
