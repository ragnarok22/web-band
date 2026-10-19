import type { AudioRuntime } from "@/audio/audio-runtime";
import {
  metronomeTimeline,
  type MetronomeFrame,
  type MetronomeTimeline,
} from "@/audio/metronome-timeline";
import { visualTimeline } from "@/audio/visual-timeline";
import { getMetronomeMeter, getMetronomePosition } from "@/lib/metronome";
import { isMetronomeConfiguration } from "@/lib/metronome-validation";
import type { CountInMeasures } from "@/types/audio";
import type {
  MetronomeClickKind,
  MetronomeConfiguration,
} from "@/types/practice";

export interface MetronomeInstrumentPlayer {
  triggerMetronome(
    time: number,
    kind: MetronomeClickKind,
    velocity: number,
  ): void;
}

export interface MetronomeSchedulerOptions {
  countInMeasures: CountInMeasures;
  onStarted(): void;
  onComplete(): void;
}

/** Scheduled audio-clock events, invalidated as a group on pause/stop. No input processing. */
export type MetronomeTimingEvent =
  | {
      kind: "scheduled";
      epoch: number;
      frame: MetronomeFrame;
      audible: boolean;
    }
  | { kind: "cancelled"; epoch: number };

export class MetronomeScheduler {
  private scheduleId: number | null = null;
  private epoch = 0;
  private scheduleGeneration = 0;
  private lastPlannedTick = -1;
  private started = false;
  private completed = false;
  private options: MetronomeSchedulerOptions | null = null;
  private configurations: Array<{
    tick: number;
    config: MetronomeConfiguration;
  }> = [];
  private sound: MetronomeConfiguration | null = null;
  private readonly callbackIds = new Set<number>();
  private readonly timingListeners = new Set<
    (event: MetronomeTimingEvent) => void
  >();

  constructor(
    private readonly runtime: AudioRuntime,
    private readonly instruments: MetronomeInstrumentPlayer,
    private readonly timeline: MetronomeTimeline = metronomeTimeline,
  ) {}

  subscribeTiming(listener: (event: MetronomeTimingEvent) => void): () => void {
    this.timingListeners.add(listener);
    return () => this.timingListeners.delete(listener);
  }

  schedule(
    config: MetronomeConfiguration,
    options: MetronomeSchedulerOptions,
  ): void {
    if (!isMetronomeConfiguration(config))
      throw new Error("Metronome configuration is invalid.");
    this.clear();
    this.options = options;
    this.configurations = [{ tick: 0, config: structuredClone(config) }];
    this.sound = structuredClone(config);
    this.runtime.setSwing(0, "16n");
    this.runtime.setTimeSignature(
      config.timeSignature.numerator,
      config.timeSignature.denominator,
    );
    // LCM(1,2,3,4)=12. This is a pulse-relative tuplet lattice, never a sixteenth grid.
    const interval =
      getMetronomeMeter(config.timeSignature, this.runtime.getPpq())
        .ticksPerPulse / 12;
    const generation = this.scheduleGeneration;
    this.scheduleId = this.runtime.scheduleRepeatTicks((time, tick) => {
      if (generation !== this.scheduleGeneration) return;
      this.tick(time, tick);
    }, interval);
  }

  /** Meter/training changes require Stop. Other rhythm changes enter the next unscheduled bar. */
  update(config: MetronomeConfiguration): void {
    if (!isMetronomeConfiguration(config))
      throw new Error("Metronome configuration is invalid.");
    const initial = this.configurations[0]?.config;
    if (!initial || !this.options) return;
    if (
      JSON.stringify(initial.timeSignature) !==
        JSON.stringify(config.timeSignature) ||
      initial.trainingMode !== config.trainingMode ||
      initial.measuresPerStage !== config.measuresPerStage ||
      initial.endBehavior !== config.endBehavior
    ) {
      throw new Error("Stop playback before changing meter or training setup.");
    }
    this.sound = structuredClone(config);
    const { ticksPerMeasure } = getMetronomeMeter(
      initial.timeSignature,
      this.runtime.getPpq(),
    );
    const tick =
      (Math.floor(
        Math.max(this.lastPlannedTick, this.runtime.getTransportTicks()) /
          ticksPerMeasure,
      ) +
        1) *
      ticksPerMeasure;
    this.configurations = this.configurations.filter(
      (entry) => entry.tick < tick,
    );
    this.configurations.push({ tick, config: structuredClone(config) });
  }

  pause(): void {
    const cancelledEpoch = this.epoch;
    this.epoch += 1;
    this.runtime.cancelDraw();
    for (const id of this.callbackIds) this.runtime.clearCallback(id);
    this.callbackIds.clear();
    this.completed = false;
    this.notify({ kind: "cancelled", epoch: cancelledEpoch });
  }

  clear(): void {
    this.scheduleGeneration += 1;
    this.pause();
    if (this.scheduleId !== null) this.runtime.clearSchedule(this.scheduleId);
    this.scheduleId = null;
    this.options = null;
    this.configurations = [];
    this.sound = null;
    this.lastPlannedTick = -1;
    this.started = false;
    this.timeline.reset();
  }

  private tick(time: number, tick: number): void {
    const options = this.options;
    if (!options || this.completed) return;
    // Never clamp a backlog of late clicks to "now" after throttling/backgrounding.
    if (time < this.runtime.getContext().currentTime - 0.04) return;
    this.lastPlannedTick = tick;
    const index = this.configurations.findLastIndex(
      (entry) => entry.tick <= tick,
    );
    const config = this.configurations[index]?.config;
    if (!config) return;
    const position = getMetronomePosition(
      config,
      tick,
      options.countInMeasures,
      this.runtime.getPpq(),
    );
    if (!position) {
      this.completed = true;
      this.atAudioTime(options.onComplete, time);
      return;
    }
    const { ticksPerPulse } = getMetronomeMeter(
      config.timeSignature,
      this.runtime.getPpq(),
    );
    const attackPosition =
      ((tick % ticksPerPulse) * position.subdivision) / ticksPerPulse;
    if (Math.abs(attackPosition - Math.round(attackPosition)) > 1e-6) return;
    const frame = { ...position, audioTime: time, transportTick: tick };
    const primary = position.subdivisionIndex === 0;
    const audible = primary || config.subdivisionAudioMode === "pulse-guide";
    if (audible && this.sound) {
      const kind = primary
        ? position.isAccent
          ? "accent"
          : "pulse"
        : "subdivision";
      const velocity =
        this.sound.metronomeVolume *
        (primary
          ? position.isAccent
            ? 0.65 + 0.35 * this.sound.accentIntensity
            : 0.65
          : 0.4 * this.sound.subdivisionVolume);
      if (velocity > 0) this.instruments.triggerMetronome(time, kind, velocity);
    }
    this.notify({ kind: "scheduled", epoch: this.epoch, frame, audible });
    const epoch = this.epoch;
    this.runtime.scheduleDraw(() => {
      if (epoch !== this.epoch) return;
      this.timeline.emit(frame);
      if (frame.phase === "count-in")
        visualTimeline.emit({
          phase: "count-in",
          beat: frame.beat,
          measure: frame.measure,
          isAccent: frame.isAccent,
        });
    }, time);
    if (!this.started && position.phase === "metronome") {
      this.atAudioTime(() => {
        if (this.started) return;
        this.started = true;
        options.onStarted();
      }, time);
    }
    // Retain at most the previous/current boundary versions, including lookahead for pause replay.
    if (index > 1) this.configurations.splice(0, index - 1);
  }

  private atAudioTime(callback: () => void, time: number): void {
    const epoch = this.epoch;
    let id: number | null = null;
    let delivered = false;
    const scheduledId = this.runtime.scheduleCallback(() => {
      delivered = true;
      if (id !== null) this.callbackIds.delete(id);
      if (epoch === this.epoch) callback();
    }, time);
    id = scheduledId;
    if (!delivered) this.callbackIds.add(id);
  }

  private notify(event: MetronomeTimingEvent): void {
    for (const listener of this.timingListeners) listener(event);
  }
}
