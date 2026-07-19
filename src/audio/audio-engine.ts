import { ToneAudioRuntime, type AudioRuntime } from "@/audio/audio-runtime";
import { InstrumentManager } from "@/audio/instrument-manager";
import {
  PatternScheduler,
  type PatternChangeMode,
  type PatternInstrumentPlayer,
} from "@/audio/pattern-scheduler";
import { visualTimeline } from "@/audio/visual-timeline";
import { clampBpm } from "@/lib/musical-time";
import { clampUnit } from "@/lib/mixer";
import { useAudioStore } from "@/stores/audio-store";
import type {
  CountInMeasures,
  FillFrequency,
  MixerSettings,
  SoundCharacter,
} from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type { GuidedPracticeConfiguration } from "@/types/practice";

export interface PlaybackConfiguration {
  bpm: number;
  countInMeasures: CountInMeasures;
  fillFrequency: FillFrequency;
  guidedPractice: GuidedPracticeConfiguration;
  humanization: number;
  masterVolume: number;
  mixer: MixerSettings;
  pattern: DrumPattern;
  soundCharacter: SoundCharacter;
  swing: number;
}

export interface ManagedInstruments extends PatternInstrumentPlayer {
  dispose: () => void;
  setMasterVolume: (volume: number) => void;
  setMixer: (settings: MixerSettings) => void;
  setSoundCharacter: (soundCharacter: SoundCharacter) => void;
  stop: () => void;
}

export type InstrumentFactory = (
  context: BaseAudioContext,
  initialVolume: number,
) => ManagedInstruments;

export class AudioEngine {
  private activeGuidedPractice: GuidedPracticeConfiguration | null = null;
  private currentPhase: "count-in" | "pattern" | null = null;
  private instruments: ManagedInstruments | null = null;
  private lifecycleGeneration = 0;
  private patternScheduler: PatternScheduler | null = null;
  private removeContextListener: (() => void) | null = null;

  constructor(
    private readonly runtime: AudioRuntime,
    private readonly createInstruments: InstrumentFactory = (context, volume) =>
      new InstrumentManager(context, volume),
  ) {}

  async play(configuration: PlaybackConfiguration): Promise<void> {
    const transportState = this.runtime.getTransportState();
    const generation =
      transportState === "stopped"
        ? ++this.lifecycleGeneration
        : this.lifecycleGeneration;

    try {
      const initialized = await this.ensureInitialized(
        configuration.masterVolume,
        generation,
      );
      if (!initialized) return;

      this.instruments?.setSoundCharacter(configuration.soundCharacter);

      if (this.runtime.getContextState() === "suspended") {
        await this.runtime.startAudio();
        if (!this.isLifecycleCurrent(generation)) return;
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

      const startingBpm =
        configuration.guidedPractice.mode === "tempoTrainer"
          ? configuration.guidedPractice.tempoTrainer.startBpm
          : configuration.bpm;
      this.runtime.setBpm(clampBpm(startingBpm), false);
      this.setMasterVolume(configuration.masterVolume);
      this.setMixer(configuration.mixer);
      this.setFillFrequency(configuration.fillFrequency);
      this.setHumanization(configuration.humanization);
      this.setSwing(configuration.swing);
      this.runtime.stopTransport();
      this.runtime.resetTransport();
      this.patternScheduler?.schedule(configuration.pattern, {
        bpm: startingBpm,
        countInMeasures: configuration.countInMeasures,
        fillFrequency: configuration.fillFrequency,
        guidedPractice: configuration.guidedPractice,
        humanization: configuration.humanization,
        onPatternStarted: () => {
          if (
            !this.isLifecycleCurrent(generation) ||
            this.runtime.getTransportState() !== "started"
          ) {
            return;
          }
          this.currentPhase = "pattern";
          useAudioStore.getState().setStatus("playing");
        },
        onTargetStop: () => {
          if (
            !this.isLifecycleCurrent(generation) ||
            this.runtime.getTransportState() !== "started"
          ) {
            return;
          }
          this.stop();
        },
        swing: configuration.swing,
      });
      this.activeGuidedPractice = configuration.guidedPractice;
      this.currentPhase =
        configuration.countInMeasures === 0 ? "pattern" : "count-in";
      useAudioStore
        .getState()
        .setStatus(
          configuration.countInMeasures === 0 ? "playing" : "counting-in",
        );
      this.runtime.startTransport();
    } catch (error) {
      if (!this.isLifecycleCurrent(generation)) return;
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
    this.patternScheduler?.cancelPendingVisuals();
    this.instruments?.stop();
    useAudioStore.getState().setStatus("paused");
  }

  stop(): void {
    const resetBpm =
      this.activeGuidedPractice?.mode === "tempoTrainer" &&
      this.activeGuidedPractice.tempoTrainer.resetToStartingBpmOnStop
        ? this.activeGuidedPractice.tempoTrainer.startBpm
        : null;
    this.lifecycleGeneration += 1;
    this.runtime.stopTransport();
    this.runtime.resetTransport();
    this.patternScheduler?.clear();
    this.instruments?.stop();
    this.currentPhase = null;
    this.activeGuidedPractice = null;
    if (resetBpm !== null) {
      this.runtime.setBpm(clampBpm(resetBpm), false);
    }

    useAudioStore.getState().setStatus("stopped");
  }

  setBpm(bpm: number, smooth = true): void {
    if (this.activeGuidedPractice?.mode === "tempoTrainer") return;

    const nextBpm = clampBpm(bpm);
    this.runtime.setBpm(nextBpm, smooth);
    this.patternScheduler?.setBpm(nextBpm);
  }

  setMasterVolume(volume: number): void {
    this.instruments?.setMasterVolume(volume);
  }

  setMixer(settings: MixerSettings): void {
    this.instruments?.setMixer(settings);
  }

  setFillFrequency(frequency: FillFrequency): void {
    this.patternScheduler?.setFillFrequency(frequency);
  }

  setHumanization(amount: number): void {
    this.patternScheduler?.setHumanization(clampUnit(amount));
  }

  setSwing(amount: number): void {
    this.patternScheduler?.setSwing(Math.min(0.65, Math.max(0, amount)));
  }

  changePattern(
    pattern: DrumPattern,
    onPatternChanged: (pattern: DrumPattern) => void,
    mode: PatternChangeMode = "measure",
  ): boolean {
    if (
      !this.patternScheduler ||
      this.runtime.getTransportState() === "stopped"
    ) {
      return false;
    }

    return this.patternScheduler.changePattern(pattern, onPatternChanged, mode);
  }

  queueStopWithFill(): boolean {
    if (
      !this.patternScheduler ||
      this.runtime.getTransportState() !== "started"
    ) {
      return false;
    }

    return this.patternScheduler.queueStopWithFill();
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

  private async ensureInitialized(
    masterVolume: number,
    generation: number,
  ): Promise<boolean> {
    if (this.instruments) {
      return this.isLifecycleCurrent(generation);
    }

    if (
      typeof window === "undefined" ||
      !("AudioContext" in window || "webkitAudioContext" in window)
    ) {
      throw new Error("This browser does not support the Web Audio API.");
    }

    useAudioStore.getState().setStatus("initializing");
    await this.runtime.startAudio();
    if (!this.isLifecycleCurrent(generation)) return false;
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
    return true;
  }

  private isLifecycleCurrent(generation: number): boolean {
    return generation === this.lifecycleGeneration;
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
