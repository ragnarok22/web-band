import { ToneAudioRuntime, type AudioRuntime } from "@/audio/audio-runtime";
import { InstrumentManager } from "@/audio/instrument-manager";
import {
  PatternScheduler,
  type PatternInstrumentPlayer,
} from "@/audio/pattern-scheduler";
import { visualTimeline } from "@/audio/visual-timeline";
import { clampBpm } from "@/lib/musical-time";
import { useAudioStore } from "@/stores/audio-store";
import type { DrumPattern } from "@/types/pattern";

export interface PlaybackConfiguration {
  bpm: number;
  masterVolume: number;
  pattern: DrumPattern;
}

export interface ManagedInstruments extends PatternInstrumentPlayer {
  dispose: () => void;
  setMasterVolume: (volume: number) => void;
  stop: () => void;
}

export type InstrumentFactory = (
  context: BaseAudioContext,
  initialVolume: number,
) => ManagedInstruments;

export class AudioEngine {
  private currentPhase: "count-in" | "pattern" | null = null;
  private instruments: ManagedInstruments | null = null;
  private patternScheduler: PatternScheduler | null = null;
  private removeContextListener: (() => void) | null = null;

  constructor(
    private readonly runtime: AudioRuntime,
    private readonly createInstruments: InstrumentFactory = (context, volume) =>
      new InstrumentManager(context, volume),
  ) {}

  async play(configuration: PlaybackConfiguration): Promise<void> {
    try {
      await this.ensureInitialized(configuration.masterVolume);

      if (this.runtime.getContextState() === "suspended") {
        await this.runtime.startAudio();
      }

      if (this.runtime.getTransportState() === "paused") {
        this.runtime.startTransport();
        useAudioStore
          .getState()
          .setStatus(
            this.currentPhase === "count-in" ? "counting-in" : "playing",
          );
        return;
      }

      if (this.runtime.getTransportState() === "started") {
        useAudioStore
          .getState()
          .setStatus(
            this.currentPhase === "count-in" ? "counting-in" : "playing",
          );
        return;
      }

      this.setBpm(configuration.bpm, false);
      this.setMasterVolume(configuration.masterVolume);
      this.runtime.stopTransport();
      this.runtime.resetTransport();
      this.patternScheduler?.schedule(configuration.pattern, {
        onPatternStarted: () => {
          this.currentPhase = "pattern";
          useAudioStore.getState().setStatus("playing");
        },
      });
      this.currentPhase = "count-in";
      useAudioStore.getState().setStatus("counting-in");
      this.runtime.startTransport();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The audio engine could not be initialized.";
      useAudioStore.getState().setError(message);
      throw error;
    }
  }

  pause(): void {
    if (this.runtime.getTransportState() !== "started") {
      return;
    }

    this.runtime.pauseTransport();
    this.instruments?.stop();
    useAudioStore.getState().setStatus("paused");
  }

  stop(): void {
    this.runtime.stopTransport();
    this.runtime.resetTransport();
    this.patternScheduler?.clear();
    this.instruments?.stop();
    this.currentPhase = null;

    if (this.instruments) {
      useAudioStore.getState().setStatus("stopped");
    }
  }

  setBpm(bpm: number, smooth = true): void {
    this.runtime.setBpm(clampBpm(bpm), smooth);
  }

  setMasterVolume(volume: number): void {
    this.instruments?.setMasterVolume(volume);
  }

  changePattern(
    pattern: DrumPattern,
    onPatternChanged: (pattern: DrumPattern) => void,
    immediate = false,
  ): boolean {
    if (
      !this.patternScheduler ||
      this.runtime.getTransportState() === "stopped"
    ) {
      return false;
    }

    this.patternScheduler.changePattern(pattern, onPatternChanged, immediate);
    return true;
  }

  dispose(): void {
    this.stop();
    this.removeContextListener?.();
    this.removeContextListener = null;
    this.patternScheduler = null;
    this.currentPhase = null;
    this.instruments?.dispose();
    this.instruments = null;
    useAudioStore.getState().setStatus("not-initialized");
  }

  private async ensureInitialized(masterVolume: number): Promise<void> {
    if (this.instruments) {
      return;
    }

    if (
      typeof window === "undefined" ||
      !("AudioContext" in window || "webkitAudioContext" in window)
    ) {
      throw new Error("This browser does not support the Web Audio API.");
    }

    useAudioStore.getState().setStatus("initializing");
    await this.runtime.startAudio();
    const context = this.runtime.getContext();
    this.instruments = this.createInstruments(context, masterVolume);
    this.patternScheduler = new PatternScheduler(
      this.runtime,
      this.instruments,
      visualTimeline,
    );
    this.removeContextListener = this.runtime.addContextStateListener(() => {
      const audioState = useAudioStore.getState().status;
      if (
        this.runtime.getContextState() === "suspended" &&
        (audioState === "playing" || audioState === "counting-in")
      ) {
        useAudioStore.getState().setStatus("suspended");
      }
    });
    useAudioStore.getState().setStatus("ready");
  }
}

let audioEngine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  audioEngine ??= new AudioEngine(new ToneAudioRuntime());
  return audioEngine;
}

export function disposeAudioEngine(): void {
  if (audioEngine) {
    audioEngine.dispose();
    audioEngine = null;
  } else {
    useAudioStore.getState().setStatus("not-initialized");
  }
}
