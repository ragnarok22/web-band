import * as Tone from "tone";

export type RuntimeTransportState = "started" | "paused" | "stopped";
export type RuntimeCallback = (time: number) => void;

export interface AudioRuntime {
  addContextStateListener(listener: () => void): () => void;
  cancelDraw(): void;
  clearSchedule(scheduleId: number): void;
  getContext(): BaseAudioContext;
  getContextState(): AudioContextState;
  getTransportState(): RuntimeTransportState;
  pauseTransport(): void;
  resetTransport(): void;
  scheduleDraw(callback: () => void, time: number): void;
  scheduleRepeat(
    callback: RuntimeCallback,
    interval: string,
    startTime?: string | number,
    duration?: string,
  ): number;
  setBpm(bpm: number, smooth: boolean): void;
  setTimeSignature(numerator: number, denominator: number): void;
  startAudio(): Promise<void>;
  startTransport(): void;
  stopTransport(): void;
}

export class ToneAudioRuntime implements AudioRuntime {
  addContextStateListener(listener: () => void): () => void {
    const context = Tone.getContext().rawContext;
    context.addEventListener("statechange", listener);
    return () => context.removeEventListener("statechange", listener);
  }

  cancelDraw(): void {
    Tone.getDraw().cancel();
  }

  clearSchedule(scheduleId: number): void {
    Tone.getTransport().clear(scheduleId);
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
    Tone.getTransport().pause();
  }

  resetTransport(): void {
    Tone.getTransport().position = 0;
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
    return Tone.getTransport().scheduleRepeat(
      callback,
      interval,
      startTime,
      duration,
    );
  }

  setBpm(bpm: number, smooth: boolean): void {
    const bpmSignal = Tone.getTransport().bpm;
    if (smooth && Tone.getTransport().state === "started") {
      bpmSignal.rampTo(bpm, 0.08);
    } else {
      bpmSignal.value = bpm;
    }
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
    Tone.getTransport().stop();
  }
}
